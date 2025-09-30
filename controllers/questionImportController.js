// backend/controllers/questionImportController.js
const Question = require("../models/Question");
const Course = require("../models/Course");
const multer = require("multer");
const csv = require("csv-parser");
const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/questions";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "text/csv",
      "application/json",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/xml",
      "application/xml",
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only CSV, JSON, Excel, and XML files are allowed."
        )
      );
    }
  },
});

// @desc    Import questions from file
// @route   POST /api/questions/import
// @access  Private (Teacher/Admin)
const importQuestions = async (req, res) => {
  try {
    console.log("📥 Starting question import process");
    console.log("👤 User:", req.user._id, "Role:", req.user.role);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const settings = JSON.parse(req.body.settings || "{}");
    console.log("⚙️ Import settings:", settings);

    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    let questions = [];

    // Parse file based on type
    switch (fileExtension) {
      case ".csv":
        questions = await parseCSV(filePath);
        break;
      case ".json":
        questions = await parseJSON(filePath);
        break;
      case ".xlsx":
      case ".xls":
        questions = await parseExcel(filePath);
        break;
      case ".xml":
        questions = await parseXML(filePath);
        break;
      default:
        throw new Error("Unsupported file format");
    }

    console.log(`📊 Parsed ${questions.length} questions from file`);

    // Process and validate questions
    const results = await processQuestions(questions, settings, req.user);

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    console.log("✅ Import completed:", results);

    res.status(200).json({
      success: true,
      message: "Questions imported successfully",
      data: results,
    });
  } catch (error) {
    console.error("❌ Import error:", error);

    // Clean up file if exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: "Failed to import questions",
      error: error.message,
    });
  }
};

// Parse CSV file
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const questions = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        try {
          const question = {
            question: row.question,
            options: [
              { text: row.option_a, isCorrect: row.correct_answer === "A" },
              { text: row.option_b, isCorrect: row.correct_answer === "B" },
              { text: row.option_c, isCorrect: row.correct_answer === "C" },
              { text: row.option_d, isCorrect: row.correct_answer === "D" },
            ].filter((opt) => opt.text), // Remove empty options
            explanation: row.explanation || "",
            difficulty: row.difficulty || "medium",
            category: row.category || "general",
            tags: row.tags ? row.tags.split(";").map((tag) => tag.trim()) : [],
            points: parseInt(row.points) || 1,
          };
          questions.push(question);
        } catch (error) {
          console.warn("⚠️ Skipping invalid row:", row);
        }
      })
      .on("end", () => {
        console.log(`✅ CSV parsed: ${questions.length} questions`);
        resolve(questions);
      })
      .on("error", reject);
  });
};

// Parse JSON file
const parseJSON = async (filePath) => {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return Array.isArray(data) ? data : [data];
  } catch (error) {
    throw new Error("Invalid JSON format");
  }
};

// Parse Excel file
const parseExcel = async (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    return data.map((row) => ({
      question: row.question,
      options: [
        { text: row.option_a, isCorrect: row.correct_answer === "A" },
        { text: row.option_b, isCorrect: row.correct_answer === "B" },
        { text: row.option_c, isCorrect: row.correct_answer === "C" },
        { text: row.option_d, isCorrect: row.correct_answer === "D" },
      ].filter((opt) => opt.text),
      explanation: row.explanation || "",
      difficulty: row.difficulty || "medium",
      category: row.category || "general",
      tags: row.tags ? row.tags.split(";").map((tag) => tag.trim()) : [],
      points: parseInt(row.points) || 1,
    }));
  } catch (error) {
    throw new Error("Invalid Excel format");
  }
};

// Parse XML file (basic implementation)
const parseXML = async (filePath) => {
  // For now, return empty array - XML parsing is more complex
  // You would need xml2js library for full implementation
  return [];
};

// Process and save questions
const processQuestions = async (questions, settings, user) => {
  const results = {
    total: questions.length,
    successful: 0,
    failed: 0,
    duplicates: 0,
    errors: [],
    successMessages: [],
  };

  for (let i = 0; i < questions.length; i++) {
    try {
      const questionData = questions[i];

      // Validate question
      if (settings.validateQuestions) {
        const validation = validateQuestion(questionData);
        if (!validation.isValid) {
          results.errors.push(`Row ${i + 1}: ${validation.error}`);
          results.failed++;
          continue;
        }
      }

      // Check for duplicates
      if (settings.skipDuplicates) {
        const existingQuestion = await Question.findOne({
          question: questionData.question,
          createdBy: user._id,
        });

        if (existingQuestion) {
          results.duplicates++;
          continue;
        }
      }

      // Apply settings
      const finalQuestionData = {
        ...questionData,
        createdBy: user._id,
        type: settings.category || questionData.type || "mcq",
        difficulty: settings.difficulty || questionData.difficulty || "medium",
        status: settings.autoPublish ? "published" : "draft",
        ...(settings.course && { course: settings.course }),
      };

      // Create question
      await Question.create(finalQuestionData);
      results.successful++;
    } catch (error) {
      console.error(`❌ Error processing question ${i + 1}:`, error);
      results.errors.push(`Row ${i + 1}: ${error.message}`);
      results.failed++;
    }
  }

  // Add success messages
  if (results.successful > 0) {
    results.successMessages.push(
      `Successfully imported ${results.successful} questions`
    );

    if (settings.course) {
      results.successMessages.push("Questions assigned to selected course");
    }

    if (settings.validateQuestions) {
      results.successMessages.push("Validation completed successfully");
    }
  }

  return results;
};

// Validate individual question
const validateQuestion = (question) => {
  if (!question.question || question.question.trim() === "") {
    return { isValid: false, error: "Question text is required" };
  }

  if (!question.options || question.options.length < 2) {
    return { isValid: false, error: "At least 2 options are required" };
  }

  const correctAnswers = question.options.filter((opt) => opt.isCorrect);
  if (correctAnswers.length === 0) {
    return { isValid: false, error: "At least one correct answer is required" };
  }

  return { isValid: true };
};

// @desc    Get import templates
// @route   GET /api/questions/import/templates/:format
// @access  Private
const getTemplate = async (req, res) => {
  try {
    const { format } = req.params;

    const templates = {
      csv: `question,option_a,option_b,option_c,option_d,correct_answer,explanation,difficulty,category,tags,points
"What is the capital of France?","London","Paris","Berlin","Madrid","B","Paris is the capital and largest city of France","easy","geography","geography;capitals","1"
"Which programming language is known for 'write once, run anywhere'?","Python","Java","JavaScript","C++","B","Java's motto is 'write once, run anywhere'","medium","programming","programming;java","2"`,

      json: JSON.stringify(
        [
          {
            question: "What is the capital of France?",
            options: [
              { text: "London", isCorrect: false },
              { text: "Paris", isCorrect: true },
              { text: "Berlin", isCorrect: false },
              { text: "Madrid", isCorrect: false },
            ],
            explanation: "Paris is the capital and largest city of France",
            difficulty: "easy",
            category: "geography",
            tags: ["geography", "capitals"],
            points: 1,
          },
        ],
        null,
        2
      ),
    };

    const template = templates[format];
    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    res.setHeader(
      "Content-Type",
      format === "json" ? "application/json" : "text/csv"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=question_template.${format}`
    );
    res.send(template);
  } catch (error) {
    console.error("❌ Template error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate template",
    });
  }
};

module.exports = {
  upload,
  importQuestions,
  getTemplate,
};
