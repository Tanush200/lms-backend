const axios = require("axios");
const CodeSubmission = require("../models/CodeSubmission");
const ProgrammingProblem = require("../models/ProgrammingProblem");

class Judge0Service {
  constructor() {
    this.baseURL =
      process.env.JUDGE0_API_URL || "https://judge0-ce.p.rapidapi.com";
    this.apiKey = process.env.JUDGE0_API_KEY;
    this.apiHost = process.env.JUDGE0_API_HOST || "judge0-ce.p.rapidapi.com";


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
      const submissionData = {
        source_code: Buffer.from(code).toString("base64"),
        language_id: languageId,
        stdin: Buffer.from(testCase.input).toString("base64"),
        expected_output: Buffer.from(testCase.expectedOutput).toString(
          "base64"
        ),
        cpu_time_limit: timeLimit,
        memory_limit: memoryLimit,
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
      const problem = await ProgrammingProblem.findById(problemId);
      if (!problem || !problem.examples[exampleIndex]) {
        throw new Error("Example not found");
      }

      const example = problem.examples[exampleIndex];
      const judge0Id = problem.getJudge0Id(language);

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

      const result = await this.pollForResult(submissionResult.token);

      return this.formatTestResult(result, example.input, example.output);
    } catch (error) {
      console.error("Example test error:", error);
      throw error;
    }
  }

  /**
   * Format test result for frontend
   */
  formatTestResult(judge0Result, input, expectedOutput) {
    const stdout = judge0Result.stdout
      ? Buffer.from(judge0Result.stdout, "base64").toString()
      : "";
    const stderr = judge0Result.stderr
      ? Buffer.from(judge0Result.stderr, "base64").toString()
      : "";
    const compileOutput = judge0Result.compile_output
      ? Buffer.from(judge0Result.compile_output, "base64").toString()
      : "";

    return {
      status: this.getStatusFromJudge0(judge0Result.status.id),
      input: input,
      expectedOutput: expectedOutput,
      actualOutput: stdout.trim(),
      executionTime: parseFloat(judge0Result.time) || 0,
      memoryUsed: parseInt(judge0Result.memory) || 0,
      errorMessage: stderr || compileOutput || "",
      judge0Status: judge0Result.status,
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
