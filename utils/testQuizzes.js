// backend/utils/testQuizzes.js
const axios = require("axios");

const API_BASE_URL = "http://localhost:5000/api";

const testQuizManagement = async () => {
  console.log("📝 Testing Quiz Management System...\n");

  try {
    let adminToken, teacherToken, studentToken;
    let courseId,
      quizId,
      questionIds = [],
      attemptId;

    // 1. Create test users and course
    console.log("1️⃣ Setting up test environment...");

    // Create admin
    const adminData = {
      name: "Quiz Admin",
      email: `admin-quiz-${Date.now()}@test.com`,
      password: "admin123",
      role: "admin",
    };

    const adminResponse = await axios.post(
      `${API_BASE_URL}/auth/register`,
      adminData
    );
    adminToken = adminResponse.data.data.auth.token;
    console.log("✅ Admin created");

    // Create teacher
    const teacherData = {
      name: "Quiz Teacher",
      email: `teacher-quiz-${Date.now()}@test.com`,
      password: "teacher123",
      role: "teacher",
    };

    const teacherResponse = await axios.post(
      `${API_BASE_URL}/auth/register`,
      teacherData
    );
    teacherToken = teacherResponse.data.data.auth.token;
    console.log("✅ Teacher created");

    // Create student
    const studentData = {
      name: "Quiz Student",
      email: `student-quiz-${Date.now()}@test.com`,
      password: "student123",
      role: "student",
    };

    const studentResponse = await axios.post(
      `${API_BASE_URL}/auth/register`,
      studentData
    );
    studentToken = studentResponse.data.data.auth.token;
    console.log("✅ Student created");

    // Create course
    const courseData = {
      title: "Quiz Test Course - JavaScript",
      description: "Course for testing quiz functionality",
      subject: "Computer Science",
      class: "12th Grade",
    };

    const courseResponse = await axios.post(
      `${API_BASE_URL}/courses`,
      courseData,
      {
        headers: { Authorization: `Bearer ${teacherToken}` },
      }
    );
    courseId = courseResponse.data.data.course._id;
    console.log("✅ Course created");

    // Publish course and enroll student
    await axios.patch(
      `${API_BASE_URL}/courses/${courseId}`,
      {
        status: "published",
        isPublic: true,
      },
      {
        headers: { Authorization: `Bearer ${teacherToken}` },
      }
    );

    await axios.post(
      `${API_BASE_URL}/courses/${courseId}/enroll`,
      {},
      {
        headers: { Authorization: `Bearer ${studentToken}` },
      }
    );
    console.log("✅ Student enrolled in course\n");

    // 2. Test question creation
    console.log("2️⃣ Testing question creation...");

    // Create MCQ question
    const mcqQuestion = {
      question: "What is the correct way to declare a variable in JavaScript?",
      type: "mcq",
      options: [
        { text: "var myVar;", isCorrect: true },
        { text: "variable myVar;", isCorrect: false },
        { text: "v myVar;", isCorrect: false },
        { text: "declare myVar;", isCorrect: false },
      ],
      points: 5,
      difficulty: "easy",
      explanation:
        "var, let, and const are the correct ways to declare variables in JavaScript",
      courseId: courseId,
    };

    const mcqResponse = await axios.post(
      `${API_BASE_URL}/questions`,
      mcqQuestion,
      {
        headers: { Authorization: `Bearer ${teacherToken}` },
      }
    );
    questionIds.push(mcqResponse.data.data.question._id);
    console.log("✅ MCQ question created");

    // Create True/False question
    const tfQuestion = {
      question: "JavaScript is a compiled language.",
      type: "true_false",
      correctAnswer: false,
      points: 3,
      difficulty: "medium",
      explanation: "JavaScript is an interpreted language, not compiled",
      courseId: courseId,
    };

    const tfResponse = await axios.post(
      `${API_BASE_URL}/questions`,
      tfQuestion,
      {
        headers: { Authorization: `Bearer ${teacherToken}` },
      }
    );
    questionIds.push(tfResponse.data.data.question._id);
    console.log("✅ True/False question created");

    // Create Short Answer question
    const saQuestion = {
      question: "What does DOM stand for?",
      type: "short_answer",
      correctAnswer: ["Document Object Model", "document object model"],
      points: 4,
      difficulty: "easy",
      courseId: courseId,
    };

    const saResponse = await axios.post(
      `${API_BASE_URL}/questions`,
      saQuestion,
      {
        headers: { Authorization: `Bearer ${teacherToken}` },
      }
    );
    questionIds.push(saResponse.data.data.question._id);
    console.log("✅ Short answer question created\n");

    // 3. Test quiz creation
    console.log("3️⃣ Testing quiz creation...");

    const quizData = {
      title: "JavaScript Fundamentals Quiz",
      description: "Test your knowledge of JavaScript basics",
      courseId: courseId,
      type: "quiz",
      category: "graded",
      duration: 30, // 30 minutes
      startTime: new Date(),
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      maxAttempts: 2,
      showResults: "immediately",
      showCorrectAnswers: true,
      passingScore: 70,
      questions: questionIds,
      status: "published",
    };

    const quizResponse = await axios.post(`${API_BASE_URL}/quizzes`, quizData, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    quizId = quizResponse.data.data.quiz._id;
    console.log("✅ Quiz created successfully");
    console.log("📝 Quiz:", quizResponse.data.data.quiz.title);
    console.log(
      "⏱️ Duration:",
      quizResponse.data.data.quiz.duration,
      "minutes"
    );
    console.log(
      "❓ Questions:",
      quizResponse.data.data.quiz.questions.length,
      "\n"
    );

    // 4. Test getting quizzes
    console.log("4️⃣ Testing quiz retrieval...");
    const quizzesResponse = await axios.get(`${API_BASE_URL}/quizzes`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    console.log("✅ Quizzes retrieved successfully");
    console.log(
      "📊 Total quizzes available to student:",
      quizzesResponse.data.data.pagination.total,
      "\n"
    );

    // 5. Test starting quiz attempt
    console.log("5️⃣ Testing quiz attempt...");
    const attemptResponse = await axios.post(
      `${API_BASE_URL}/quizzes/${quizId}/attempt`,
      {},
      {
        headers: { Authorization: `Bearer ${studentToken}` },
      }
    );

    attemptId = attemptResponse.data.data.attempt._id;
    console.log("✅ Quiz attempt started successfully");
    console.log("🎯 Attempt ID:", attemptId);
    console.log(
      "📚 Questions in quiz:",
      attemptResponse.data.data.quiz.questions.length,
      "\n"
    );

    // 6. Test submitting answers
    console.log("6️⃣ Testing answer submission...");

    // Answer MCQ question (first option - correct)
    await axios.patch(
      `${API_BASE_URL}/quiz-attempts/${attemptId}/answer`,
      {
        questionId: questionIds[0],
        answer: 0, // First option
        timeSpent: 30,
      },
      {
        headers: { Authorization: `Bearer ${studentToken}` },
      }
    );
    console.log("✅ MCQ answer submitted");

    // Answer True/False question (false - correct)
    await axios.patch(
      `${API_BASE_URL}/quiz-attempts/${attemptId}/answer`,
      {
        questionId: questionIds[1],
        answer: false,
        timeSpent: 20,
      },
      {
        headers: { Authorization: `Bearer ${studentToken}` },
      }
    );
    console.log("✅ True/False answer submitted");

    // Answer Short Answer question
    await axios.patch(
      `${API_BASE_URL}/quiz-attempts/${attemptId}/answer`,
      {
        questionId: questionIds[2],
        answer: "Document Object Model",
        timeSpent: 45,
      },
      {
        headers: { Authorization: `Bearer ${studentToken}` },
      }
    );
    console.log("✅ Short answer submitted\n");

    // 7. Test quiz submission
    console.log("7️⃣ Testing quiz submission...");
    const submitResponse = await axios.post(
      `${API_BASE_URL}/quiz-attempts/${attemptId}/submit`,
      {},
      {
        headers: { Authorization: `Bearer ${studentToken}` },
      }
    );

    console.log("✅ Quiz submitted successfully");
    console.log("📊 Results:");
    if (submitResponse.data.data.results) {
      console.log(
        "- Total Score:",
        submitResponse.data.data.results.totalScore
      );
      console.log("- Max Score:", submitResponse.data.data.results.maxScore);
      console.log(
        "- Percentage:",
        submitResponse.data.data.results.percentage + "%"
      );
      console.log(
        "- Passed:",
        submitResponse.data.data.results.passed ? "Yes" : "No"
      );
    }
    console.log(
      "- Questions Answered:",
      submitResponse.data.data.attempt.questionsAnswered
    );
    console.log(
      "- Time Spent:",
      Math.round(submitResponse.data.data.attempt.timeSpent / 60),
      "minutes\n"
    );

    // 8. Test getting quiz results
    console.log("8️⃣ Testing result retrieval...");
    const resultResponse = await axios.get(
      `${API_BASE_URL}/quiz-attempts/${attemptId}`,
      {
        headers: { Authorization: `Bearer ${studentToken}` },
      }
    );

    console.log("✅ Quiz results retrieved");
    console.log(
      "📈 Final Score:",
      resultResponse.data.data.attempt.percentage + "%"
    );
    console.log(
      "✅ Questions Correct:",
      resultResponse.data.data.attempt.questionsCorrect
    );
    console.log(
      "❌ Questions Incorrect:",
      resultResponse.data.data.attempt.questionsIncorrect,
      "\n"
    );

    // 9. Test teacher viewing attempts
    console.log("9️⃣ Testing teacher quiz analytics...");
    const teacherAttemptsResponse = await axios.get(
      `${API_BASE_URL}/quizzes/${quizId}/attempts`,
      {
        headers: { Authorization: `Bearer ${teacherToken}` },
      }
    );

    console.log("✅ Teacher can view all attempts");
    console.log("📊 Summary:");
    console.log(
      "- Total Attempts:",
      teacherAttemptsResponse.data.data.summary.totalAttempts
    );
    console.log(
      "- Submitted Attempts:",
      teacherAttemptsResponse.data.data.summary.submittedAttempts
    );
    console.log(
      "- Average Score:",
      teacherAttemptsResponse.data.data.summary.averageScore + "%"
    );
    console.log(
      "- Needs Manual Grading:",
      teacherAttemptsResponse.data.data.summary.needsManualGrading,
      "\n"
    );

    // 10. Test quiz statistics
    console.log("🔟 Testing quiz statistics...");
    const statsResponse = await axios.get(
      `${API_BASE_URL}/quizzes/${quizId}/stats`,
      {
        headers: { Authorization: `Bearer ${teacherToken}` },
      }
    );

    console.log("✅ Quiz statistics retrieved");
    console.log("📈 Statistics:");
    console.log(
      "- Total Attempts:",
      statsResponse.data.data.stats.basic.totalAttempts
    );
    console.log(
      "- Average Score:",
      Math.round(statsResponse.data.data.stats.basic.averageScore) + "%"
    );
    console.log(
      "- Pass Rate:",
      Math.round(statsResponse.data.data.stats.basic.passRate) + "%"
    );

    console.log("\n🎉 All quiz management tests passed!");
  } catch (error) {
    console.error("❌ Test failed:");
    console.error("Status:", error.response?.status);
    console.error("Error:", error.response?.data || error.message);
    console.error("URL:", error.config?.url);
    if (error.response?.data) {
      console.error(
        "Full response:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
  }
};

// Run tests
if (require.main === module) {
  testQuizManagement();
}

module.exports = testQuizManagement;
