
const express = require("express");
const judge0Service = require("../services/judge0Service");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// @desc    Test Judge0 API connection
// @route   GET /api/judge0/test
// @access  Private (Admin only)
const testConnection = async (req, res) => {
  try {
    const result = await judge0Service.testConnection();

    res.json({
      success: result.success,
      message: result.success
        ? "Judge0 API connection successful"
        : "Judge0 API connection failed",
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not test Judge0 connection",
      error: error.message,
    });
  }
};

// @desc    Get supported languages from Judge0
// @route   GET /api/judge0/languages
// @access  Private
const getSupportedLanguages = async (req, res) => {
  try {
    const languages = await judge0Service.getSupportedLanguages();

    res.json({
      success: true,
      data: { languages },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not get supported languages",
      error: error.message,
    });
  }
};

// @desc    Get Judge0 system status
// @route   GET /api/judge0/status
// @access  Private (Admin only)
const getSystemStatus = async (req, res) => {
  try {
    const connectionTest = await judge0Service.testConnection();
    const languages = await judge0Service.getSupportedLanguages();

    const status = {
      apiConnection: connectionTest.success,
      supportedLanguages: languages.length,
      defaultLanguages: Object.keys(judge0Service.defaultLanguageIds).length,
      configuration: {
        baseURL: judge0Service.baseURL,
        hasApiKey: !!judge0Service.apiKey,
        pollingInterval: judge0Service.pollingInterval,
        maxPollingTime: judge0Service.maxPollingTime,
      },
    };

    res.json({
      success: true,
      data: { status },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not get system status",
      error: error.message,
    });
  }
};

router.get("/test", protect, authorize("admin"), testConnection);
router.get("/languages", protect, getSupportedLanguages);
router.get("/status", protect, authorize("admin"), getSystemStatus);

module.exports = router;
