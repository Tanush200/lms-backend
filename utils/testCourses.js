// backend/utils/testCourses.js
const axios = require("axios");

const API_BASE_URL = "http://localhost:5000/api";

const testCourseManagement = async () => {
  console.log("📚 Testing Course Management System...\n");

  try {
    let adminToken, teacherToken, studentToken;
    let courseId, enrollmentId;

    // 1. Create test users
    console.log("1️⃣ Creating test users...");

    // Create admin
    const adminData = {
      name: "Course Admin",
      email: `admin-${Date.now()}@test.com`,
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
      name: "Course Teacher",
      email: `teacher-${Date.now()}@test.com`,
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
      name: "Course Student",
      email: `student-${Date.now()}@test.com`,
      password: "student123",
      role: "student",
    };

    const studentResponse = await axios.post(
      `${API_BASE_URL}/auth/register`,
      studentData
    );
    studentToken = studentResponse.data.data.auth.token;
    console.log("✅ Student created\n");

    // 2. Test course creation
    console.log("2️⃣ Testing course creation...");
    const courseData = {
      title: "Test Course - JavaScript Fundamentals",
      description: "Learn JavaScript from basics to advanced concepts",
      shortDescription: "JavaScript course for beginners",
      subject: "Computer Science",
      class: "10th Grade",
      category: "technical",
      level: "beginner",
      maxStudents: 50,
      allowSelfEnrollment: true,
    };

    const courseResponse = await axios.post(
      `${API_BASE_URL}/courses`,
      courseData,
      {
        headers: { Authorization: `Bearer ${teacherToken}` },
      }
    );

    courseId = courseResponse.data.data.course._id;
    console.log("✅ Course created successfully");
    console.log("📝 Course:", courseResponse.data.data.course.title);
    console.log(
      "👨‍🏫 Instructor:",
      courseResponse.data.data.course.instructor.name,
      "\n"
    );

    // 3. Test getting courses
    console.log("3️⃣ Testing course retrieval...");
    const coursesResponse = await axios.get(`${API_BASE_URL}/courses`);
    console.log("✅ Courses retrieved successfully");
    console.log(
      "📊 Total courses:",
      coursesResponse.data.data.pagination.total,
      "\n"
    );

    // 4. Test course publishing
    console.log("4️⃣ Testing course publishing...");
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
    console.log("✅ Course published successfully\n");

    // 5. Test student enrollment
    console.log("5️⃣ Testing student enrollment...");
    const enrollmentResponse = await axios.post(
      `${API_BASE_URL}/courses/${courseId}/enroll`,
      {},
      {
        headers: { Authorization: `Bearer ${studentToken}` },
      }
    );

    enrollmentId = enrollmentResponse.data.data.enrollment._id;
    console.log("✅ Student enrolled successfully");
    console.log(
      "📚 Enrollment status:",
      enrollmentResponse.data.data.enrollment.status,
      "\n"
    );

    // 6. Test getting enrollments
    console.log("6️⃣ Testing enrollment retrieval...");
    const studentEnrollments = await axios.get(
      `${API_BASE_URL}/enrollments/student/${studentResponse.data.data.user.id}`,
      {
        headers: { Authorization: `Bearer ${studentToken}` },
      }
    );

    console.log("✅ Student enrollments retrieved");
    console.log(
      "📈 Enrollment count:",
      studentEnrollments.data.data.enrollmentsCount
    );

    const courseEnrollments = await axios.get(
      `${API_BASE_URL}/courses/${courseId}/enrollments`,
      {
        headers: { Authorization: `Bearer ${teacherToken}` },
      }
    );

    console.log("✅ Course enrollments retrieved");
    console.log(
      "👥 Students enrolled:",
      courseEnrollments.data.data.enrollmentsCount,
      "\n"
    );

    // 7. Test adding course materials
    console.log("7️⃣ Testing course materials...");
    const materialData = {
      name: "JavaScript Introduction PDF",
      description: "Basic introduction to JavaScript concepts",
      type: "pdf",
      url: "https://example.com/js-intro.pdf",
      isRequired: true,
      order: 1,
    };

    await axios.post(
      `${API_BASE_URL}/courses/${courseId}/materials`,
      materialData,
      {
        headers: { Authorization: `Bearer ${teacherToken}` },
      }
    );
    console.log("✅ Course material added successfully");

    // Get course materials
    const materialsResponse = await axios.get(
      `${API_BASE_URL}/courses/${courseId}/materials`,
      {
        headers: { Authorization: `Bearer ${studentToken}` },
      }
    );
    console.log("✅ Course materials retrieved");
    console.log(
      "📄 Materials count:",
      materialsResponse.data.data.materialsCount,
      "\n"
    );

    // 8. Test progress tracking
    console.log("8️⃣ Testing progress tracking...");
    const materialId = materialsResponse.data.data.materials[0]._id;

    await axios.patch(
      `${API_BASE_URL}/enrollments/${enrollmentId}/progress`,
      {
        materialId: materialId,
        timeSpent: 300, // 5 minutes
        completed: true,
      },
      {
        headers: { Authorization: `Bearer ${studentToken}` },
      }
    );
    console.log("✅ Progress updated successfully\n");

    console.log("🎉 All course management tests passed!");
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);
  }
};

// Run tests
if (require.main === module) {
  testCourseManagement();
}

module.exports = testCourseManagement;
