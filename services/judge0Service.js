const axios = require("axios");
const CodeSubmission = require("../models/CodeSubmission");
const ProgrammingProblem = require("../models/ProgrammingProblem");

class Judge0Service {
  constructor() {
    this.baseURL =
      process.env.JUDGE0_API_URL || "https://judge0-ce.p.rapidapi.com";
    this.apiKey = process.env.JUDGE0_API_KEY;
    this.apiHost = process.env.JUDGE0_API_HOST || "judge0-ce.p.rapidapi.com";
    
    // Check if API key is configured
    if (!this.apiKey) {
      console.warn('⚠️ JUDGE0_API_KEY is not configured. Code execution will not work.');
      console.warn('Please set JUDGE0_API_KEY in your .env file.');
    }


    this.defaultLanguageIds = {
      javascript: 63, // Node.js (14.15.4)
      python: 71, // Python (3.8.1)
      java: 62, // Java (OpenJDK 13.0.1)
      cpp: 54, // C++ (GCC 9.2.0)
      c: 50, // C (GCC 9.2.0)
    };


    this.pollingInterval = 1000; // 
    this.maxPollingTime = 30000; // 
  }

  /**
   * Execute code for a programming problem
   */
  async executeCode(executionData) {
    const {
      code,
      language,
      problemId,
      userId,
      submissionNumber = 1,
      hintsUsed = [],
    } = executionData;

    try {
      console.log(
        `🚀 Starting code execution for user ${userId}, problem ${problemId}`
      );

      const problem = await ProgrammingProblem.findById(problemId);
      if (!problem) {
        throw new Error("Programming problem not found");
      }

      const judge0Id = problem.getJudge0Id(language);
      if (!judge0Id) {
        throw new Error(`Language ${language} not supported for this problem`);
      }

      const submission = await CodeSubmission.create({
        user: userId,
        problem: problemId,
        language,
        code,
        status: "pending",
        submissionNumber,
        hintsUsed,
        submittedAt: new Date(),
        totalTests: problem.testCases.length,
      });

      console.log(`📝 Created submission ${submission._id}`);

      this.processExecution(submission, problem, code, language, judge0Id);

      return submission;
    } catch (error) {
      console.error("Code execution setup error:", error);
      throw error;
    }
  }

  /**
   * Process code execution with Judge0
   */
  async processExecution(submission, problem, code, language, judge0Id) {
    try {
      console.log(`⚡ Processing execution ${submission._id}`);


      await CodeSubmission.findByIdAndUpdate(submission._id, {
        status: "running",
      });


      const submissionPromises = problem.testCases.map((testCase, index) =>
        this.submitToJudge0(
          code,
          judge0Id,
          testCase,
          problem.timeLimit,
          problem.memoryLimit,
          index
        )
      );

      const judge0Submissions = await Promise.all(submissionPromises);
      console.log(
        `📤 Submitted ${judge0Submissions.length} test cases to Judge0`
      );


      const judge0Results = await this.waitForAllResults(judge0Submissions);
      console.log(`📥 Received all results for submission ${submission._id}`);


      const updatedSubmission = await CodeSubmission.findById(submission._id);
      updatedSubmission.updateResults(judge0Results, problem.testCases);
      await updatedSubmission.save();


      problem.updateStats(updatedSubmission);
      await problem.save();

      console.log(
        `✅ Execution ${submission._id} completed with status: ${updatedSubmission.status}`
      );

      return updatedSubmission;
    } catch (error) {
      console.error(`❌ Execution ${submission._id} failed:`, error);


      await CodeSubmission.findByIdAndUpdate(submission._id, {
        status: "internal_error",
        completedAt: new Date(),
      });

      throw error;
    }
  }

  /**
   * Submit single test case to Judge0
   */
  async submitToJudge0(
    code,
    languageId,
    testCase,
    timeLimit,
    memoryLimit,
    testIndex
  ) {
    try {
      // Judge0 memory limit must be in KB and max 2048000 (2GB)
      // Convert from bytes to KB if needed and cap at maximum
      let memoryLimitKB = memoryLimit;
      
      // If memory limit seems to be in bytes (> 2048000), convert to KB
      if (memoryLimit > 2048000) {
        memoryLimitKB = Math.floor(memoryLimit / 1024);
      }
      
      // Cap at Judge0's maximum (2GB = 2048000 KB)
      memoryLimitKB = Math.min(memoryLimitKB, 2048000);
      
      console.log(`📊 Memory limit: ${memoryLimit} -> ${memoryLimitKB} KB (capped at 2048000)`);
      
      const submissionData = {
        source_code: Buffer.from(code).toString("base64"),
        language_id: languageId,
        stdin: Buffer.from(testCase.input).toString("base64"),
        expected_output: Buffer.from(testCase.expectedOutput).toString(
          "base64"
        ),
        cpu_time_limit: timeLimit,
        memory_limit: memoryLimitKB,
        wall_time_limit: timeLimit + 2,
        enable_per_process_and_thread_time_limit: false,
        enable_per_process_and_thread_memory_limit: false,
        max_processes_and_or_threads: 60,
        enable_network: false,
      };

      const response = await axios.post(
        `${this.baseURL}/submissions?base64_encoded=true&wait=false`,
        submissionData,
        {
          headers: {
            "Content-Type": "application/json",
            "X-RapidAPI-Key": this.apiKey,
            "X-RapidAPI-Host": this.apiHost,
          },
        }
      );

      return {
        token: response.data.token,
        testIndex: testIndex,
      };
    } catch (error) {
      console.error(
        `Judge0 submission error for test ${testIndex}:`,
        error.response?.data || error.message
      );
      throw new Error(`Failed to submit test case ${testIndex} to Judge0`);
    }
  }

  /**
   * Wait for all Judge0 results
   */
  async waitForAllResults(submissions) {
    const results = [];

    for (const submission of submissions) {
      try {
        const result = await this.pollForResult(submission.token);
        results[submission.testIndex] = result;
      } catch (error) {
        console.error(
          `Failed to get result for token ${submission.token}:`,
          error
        );

        results[submission.testIndex] = {
          status: { id: 13, description: "Internal Error" },
          stdout: null,
          stderr: Buffer.from(error.message).toString("base64"),
          time: null,
          memory: null,
        };
      }
    }

    return results;
  }

  /*
   * Poll Judge0 for result
   */
  async pollForResult(token) {
    const startTime = Date.now();

    while (Date.now() - startTime < this.maxPollingTime) {
      try {
        const response = await axios.get(
          `${this.baseURL}/submissions/${token}?base64_encoded=true&fields=*`,
          {
            headers: {
              "X-RapidAPI-Key": this.apiKey,
              "X-RapidAPI-Host": this.apiHost,
            },
          }
        );

        const result = response.data;

        if (result.status.id <= 2) {
          await this.sleep(this.pollingInterval);
          continue;
        }

        return result;
      } catch (error) {
        console.error("Polling error:", error);
        throw new Error(`Failed to poll Judge0 result for token ${token}`);
      }
    }

    throw new Error(`Polling timeout for token ${token}`);
  }

  /**
   * Test a single example
   */
  async testExample(code, language, problemId, exampleIndex) {
    try {
      // Check if API key is configured
      if (!this.apiKey) {
        throw new Error('Judge0 API key is not configured. Please contact the administrator.');
      }
      
      console.log(`🔍 Finding problem ${problemId}...`);
      const problem = await ProgrammingProblem.findById(problemId);
      
      if (!problem) {
        throw new Error(`Problem ${problemId} not found`);
      }

      if (!problem.examples || problem.examples.length === 0) {
        throw new Error("Problem has no examples");
      }

      if (!problem.examples[exampleIndex]) {
        throw new Error(`Example index ${exampleIndex} not found. Problem has ${problem.examples.length} examples.`);
      }

      const example = problem.examples[exampleIndex];
      console.log(`📝 Testing with example ${exampleIndex}:`, {
        input: example.input?.substring(0, 50),
        expectedOutput: example.output?.substring(0, 50)
      });

      const judge0Id = problem.getJudge0Id(language);
      if (!judge0Id) {
        throw new Error(`Language ${language} not supported for this problem`);
      }

      console.log(`🚀 Submitting to Judge0 with language ID: ${judge0Id}`);

      const submissionResult = await this.submitToJudge0(
        code,
        judge0Id,
        {
          input: example.input,
          expectedOutput: example.output,
        },
        problem.timeLimit,
        problem.memoryLimit,
        0
      );

      console.log(`⏳ Polling for result with token: ${submissionResult.token}`);
      const result = await this.pollForResult(submissionResult.token);

      console.log(`✅ Test completed with status: ${result.status?.description}`);
      return this.formatTestResult(result, example.input, example.output);
    } catch (error) {
      console.error("❌ Example test error:", error.message);
      console.error("Error stack:", error.stack);
      
      // Provide more helpful error messages
      if (error.message.includes('API key')) {
        throw new Error('Judge0 API is not configured. Please contact your administrator.');
      } else if (error.response?.status === 401) {
        throw new Error('Invalid Judge0 API credentials. Please contact your administrator.');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a few moments.');
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new Error('Cannot connect to Judge0 service. Please try again later.');
      }
      
      throw error;
    }
  }

  /**
   * Format test result for frontend
   */
  formatTestResult(judge0Result, input, expectedOutput) {
    // Safely decode base64 outputs
    let stdout = "";
    let stderr = "";
    let compileOutput = "";
    
    try {
      stdout = judge0Result.stdout
        ? Buffer.from(judge0Result.stdout, "base64").toString()
        : "";
    } catch (e) {
      console.error("Error decoding stdout:", e);
      stdout = "";
    }
    
    try {
      stderr = judge0Result.stderr
        ? Buffer.from(judge0Result.stderr, "base64").toString()
        : "";
    } catch (e) {
      console.error("Error decoding stderr:", e);
      stderr = "";
    }
    
    try {
      compileOutput = judge0Result.compile_output
        ? Buffer.from(judge0Result.compile_output, "base64").toString()
        : "";
    } catch (e) {
      console.error("Error decoding compile output:", e);
      compileOutput = "";
    }

    // Normalize outputs for comparison
    const normalizeOutput = (output) => {
      if (!output) return "";
      return output
        .trim()
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n+/g, '\n')
        .trim();
    };

    const normalizedActual = normalizeOutput(stdout);
    const normalizedExpected = normalizeOutput(expectedOutput);
    
    // Determine if the test passed based on Judge0 status and output comparison
    let status = this.getStatusFromJudge0(judge0Result.status.id);
    
    // If Judge0 says accepted (status 3), double-check the output
    if (judge0Result.status.id === 3) {
      status = normalizedActual === normalizedExpected ? "accepted" : "wrong_answer";
    }

    console.log(`Judge0 Result - Status: ${judge0Result.status.id} (${judge0Result.status.description})`);
    console.log(`Expected: "${normalizedExpected}"`);
    console.log(`Actual: "${normalizedActual}"`);
    console.log(`Final Status: ${status}`);

    return {
      status: status,
      input: input,
      expectedOutput: expectedOutput,
      actualOutput: stdout.trim(),
      executionTime: parseFloat(judge0Result.time) || 0,
      memoryUsed: parseInt(judge0Result.memory) || 0,
      errorMessage: stderr || compileOutput || "",
      judge0Status: judge0Result.status,
      normalizedActual: normalizedActual,
      normalizedExpected: normalizedExpected,
    };
  }

  /**
   * Convert Judge0 status to our status
   */
  getStatusFromJudge0(statusId) {
    switch (statusId) {
      case 3:
        return "accepted";
      case 4:
        return "wrong_answer";
      case 5:
        return "time_limit_exceeded";
      case 6:
        return "compile_error";
      case 7:
      case 8:
      case 9:
      case 10:
      case 11:
      case 12:
        return "runtime_error";
      default:
        return "internal_error";
    }
  }

  /**
   * Get supported languages
   */
  async getSupportedLanguages() {
    try {
      const response = await axios.get(`${this.baseURL}/languages`, {
        headers: {
          "X-RapidAPI-Key": this.apiKey,
          "X-RapidAPI-Host": this.apiHost,
        },
      });

      return response.data.filter((lang) =>
        Object.values(this.defaultLanguageIds).includes(lang.id)
      );
    } catch (error) {
      console.error("Failed to get Judge0 languages:", error);
      return [];
    }
  }

  /**
   * Test Judge0 API connection
   */
  async testConnection() {
    try {
      const response = await axios.get(`${this.baseURL}/about`, {
        headers: {
          "X-RapidAPI-Key": this.apiKey,
          "X-RapidAPI-Host": this.apiHost,
        },
      });

      console.log("✅ Judge0 API connection successful");
      return { success: true, data: response.data };
    } catch (error) {
      console.error(
        "❌ Judge0 API connection failed:",
        error.response?.data || error.message
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Get submission status
   */
  async getSubmissionStatus(submissionId) {
    return await CodeSubmission.findById(submissionId)
      .populate("problem", "title difficulty")
      .populate("user", "name email");
  }

  /**
   * Utility sleep function
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}


module.exports = new Judge0Service();
