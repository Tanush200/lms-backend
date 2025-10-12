// const Course = require("../models/Course");
// const { uploadCourseContent, deleteFile } = require("../config/cloudinary");

// // @desc    Add material to course
// // @route   POST /api/courses/:courseId/materials
// // @access  Private (Course instructor or Admin/Principal)
// const addMaterial = async (req, res) => {
//   try {
//     const { courseId } = req.params;
//     const { name, description, type, url, isRequired, order } = req.body;

//     const course = await Course.findById(courseId);
//     if (!course) {
//       return res.status(404).json({
//         success: false,
//         message: "Course not found",
//       });
//     }


//     const isInstructor =
//       course.instructor.toString() === req.user._id.toString();
//     const isAssistant = course.assistantInstructors.includes(req.user._id);
//     const isAdmin = ["admin", "principal"].includes(req.user.role);

//     if (!isInstructor && !isAssistant && !isAdmin) {
//       return res.status(403).json({
//         success: false,
//         message: "Not authorized to add materials to this course",
//       });
//     }


//     const material = {
//       name: name || "Untitled Material",
//       description,
//       type: type || "document",
//       url: url || "",
//       isRequired: isRequired !== undefined ? isRequired : true,
//       order: order || course.materials.length,
//       uploadedBy: req.user._id,
//       uploadedAt: new Date(),
//     };


//     if (req.file) {
//       material.url = req.file.path;
//       material.public_id = req.file.filename;
//       material.size = req.file.size;
//     }


//     course.materials.push(material);
//     await course.save();


//     const newMaterial = course.materials[course.materials.length - 1];

//     res.status(201).json({
//       success: true,
//       message: "Material added successfully",
//       data: { material: newMaterial },
//     });
//   } catch (error) {
//     console.error("Add material error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Could not add material",
//       error: error.message,
//     });
//   }
// };

// // @desc    Get course materials
// // @route   GET /api/courses/:courseId/materials
// // @access  Private (Enrolled students or Course instructors)
// const getMaterials = async (req, res) => {
//   try {
//     const { courseId } = req.params;

//     const course = await Course.findById(courseId)
//       .populate("materials.uploadedBy", "name email")
//       .select("materials instructor assistantInstructors title");

//     if (!course) {
//       return res.status(404).json({
//         success: false,
//         message: "Course not found",
//       });
//     }


//     let hasAccess = false;
//     let materials = course.materials;

//     if (["admin", "principal"].includes(req.user.role)) {
//       hasAccess = true;
//     } else if (req.user.role === "teacher") {
//       hasAccess =
//         course.instructor.toString() === req.user._id.toString() ||
//         course.assistantInstructors.includes(req.user._id);
//     } else if (req.user.role === "student") {
//       const Enrollment = require("../models/Enrollment");
//       const enrollment = await Enrollment.findOne({
//         student: req.user._id,
//         course: courseId,
//         status: { $in: ["active", "completed"] },
//       });

//       hasAccess = !!enrollment;

//       if (enrollment) {
//         // For now, show all materials to enrolled students
//         // Later can be enhanced to show materials based on progress
//       }
//     }

//     if (!hasAccess) {
//       return res.status(403).json({
//         success: false,
//         message: "Access denied to course materials",
//       });
//     }

//     materials = materials.sort((a, b) => a.order - b.order);

//     res.json({
//       success: true,
//       data: {
//         course: {
//           id: course._id,
//           title: course.title,
//         },
//         materialsCount: materials.length,
//         materials,
//       },
//     });
//   } catch (error) {
//     console.error("Get materials error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Could not get materials",
//       error: error.message,
//     });
//   }
// };

// // @desc    Update material
// // @route   PATCH /api/courses/:courseId/materials/:materialId
// // @access  Private (Course instructor or Admin/Principal)
// const updateMaterial = async (req, res) => {
//   try {
//     const { courseId, materialId } = req.params;
//     const { name, description, type, url, isRequired, order } = req.body;

//     const course = await Course.findById(courseId);
//     if (!course) {
//       return res.status(404).json({
//         success: false,
//         message: "Course not found",
//       });
//     }

//     const isInstructor =
//       course.instructor.toString() === req.user._id.toString();
//     const isAssistant = course.assistantInstructors.includes(req.user._id);
//     const isAdmin = ["admin", "principal"].includes(req.user.role);

//     if (!isInstructor && !isAssistant && !isAdmin) {
//       return res.status(403).json({
//         success: false,
//         message: "Not authorized to update materials",
//       });
//     }


//     const material = course.materials.id(materialId);
//     if (!material) {
//       return res.status(404).json({
//         success: false,
//         message: "Material not found",
//       });
//     }

//     if (name !== undefined) material.name = name;
//     if (description !== undefined) material.description = description;
//     if (type !== undefined) material.type = type;
//     if (url !== undefined) material.url = url;
//     if (isRequired !== undefined) material.isRequired = isRequired;
//     if (order !== undefined) material.order = order;


//     if (req.file) {

//       if (material.public_id) {
//         try {
//           await deleteFile(material.public_id);
//         } catch (error) {
//           console.error("Error deleting old file:", error);
//         }
//       }

//       material.url = req.file.path;
//       material.public_id = req.file.filename;
//       material.size = req.file.size;
//     }

//     await course.save();

//     res.json({
//       success: true,
//       message: "Material updated successfully",
//       data: { material },
//     });
//   } catch (error) {
//     console.error("Update material error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Could not update material",
//       error: error.message,
//     });
//   }
// };

// // @desc    Delete material
// // @route   DELETE /api/courses/:courseId/materials/:materialId
// // @access  Private (Course instructor or Admin/Principal)
// const deleteMaterial = async (req, res) => {
//   try {
//     const { courseId, materialId } = req.params;

//     const course = await Course.findById(courseId);
//     if (!course) {
//       return res.status(404).json({
//         success: false,
//         message: "Course not found",
//       });
//     }


//     const isInstructor =
//       course.instructor.toString() === req.user._id.toString();
//     const isAssistant = course.assistantInstructors.includes(req.user._id);
//     const isAdmin = ["admin", "principal"].includes(req.user.role);

//     if (!isInstructor && !isAssistant && !isAdmin) {
//       return res.status(403).json({
//         success: false,
//         message: "Not authorized to delete materials",
//       });
//     }


//     const material = course.materials.id(materialId);
//     if (!material) {
//       return res.status(404).json({
//         success: false,
//         message: "Material not found",
//       });
//     }


//     if (material.public_id) {
//       try {
//         await deleteFile(material.public_id);
//       } catch (error) {
//         console.error("Error deleting file:", error);
//       }
//     }


//     course.materials.pull(materialId);
//     await course.save();

//     res.json({
//       success: true,
//       message: "Material deleted successfully",
//     });
//   } catch (error) {
//     console.error("Delete material error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Could not delete material",
//       error: error.message,
//     });
//   }
// };

// // @desc    Upload course material file
// // @route   POST /api/courses/:courseId/materials/upload
// // @access  Private (Course instructor or Admin/Principal)
// const uploadMaterialFile = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         message: "No file uploaded",
//       });
//     }

//     console.log("📤 File upload successful:", req.file);

//     res.json({
//       success: true,
//       message: "File uploaded successfully",
//       data: {
//         url: req.file.path,
//         public_id: req.file.filename,
//         size: req.file.size,
//         originalname: req.file.originalname,
//         mimetype: req.file.mimetype,
//       },
//     });
//   } catch (error) {
//     console.error("❌ Upload file error:", error);
//     res.status(500).json({
//       success: false,
//       message: "File upload failed",
//       error: error.message,
//     });
//   }
// };

// module.exports = {
//   addMaterial,
//   getMaterials,
//   updateMaterial,
//   deleteMaterial,
//   uploadMaterialFile,
// };



const Course = require("../models/Course");
const { uploadCourseContent, deleteFile } = require("../config/cloudinary");

// @desc    Add material to course
// @route   POST /api/courses/:courseId/materials
// @access  Private (Course instructor or Admin/Principal)
const addMaterial = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { name, description, type, url, isRequired, order } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // ✅ School access validation
    if (req.user.role !== "super_admin") {
      const userSchoolId = (req.user.school?._id || req.user.school).toString();
      const courseSchoolId = (course.school?._id || course.school).toString();

      if (courseSchoolId !== userSchoolId) {
        return res.status(403).json({
          success: false,
          message: "Cannot add materials to course from different school",
        });
      }
    }

    const isInstructor =
      course.instructor.toString() === req.user._id.toString();
    const isAssistant = course.assistantInstructors.includes(req.user._id);
    const isAdmin = ["super_admin", "admin", "principal"].includes(
      req.user.role
    );

    if (!isInstructor && !isAssistant && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to add materials to this course",
      });
    }

    const material = {
      name: name || "Untitled Material",
      description,
      type: type || "document",
      url: url || "",
      isRequired: isRequired !== undefined ? isRequired : true,
      order: order || course.materials.length,
      uploadedBy: req.user._id,
      uploadedAt: new Date(),
    };

    if (req.file) {
      material.url = req.file.path;
      material.public_id = req.file.filename;
      material.size = req.file.size;
    }

    course.materials.push(material);
    await course.save();

    const newMaterial = course.materials[course.materials.length - 1];

    res.status(201).json({
      success: true,
      message: "Material added successfully",
      data: { material: newMaterial },
    });
  } catch (error) {
    console.error("Add material error:", error);
    res.status(500).json({
      success: false,
      message: "Could not add material",
      error: error.message,
    });
  }
};

// @desc    Get course materials
// @route   GET /api/courses/:courseId/materials
// @access  Private (Enrolled students or Course instructors)
const getMaterials = async (req, res) => {
  try {
    const { courseId } = req.params;

    console.log("📁 Getting materials for course:", courseId);
    console.log("👤 User:", req.user._id, req.user.role);
    console.log("🏫 User school:", req.user.school);

    const course = await Course.findById(courseId)
      .populate("materials.uploadedBy", "name email")
      .populate("school", "name code")
      .select("materials instructor assistantInstructors title school");

    if (!course) {
      console.log("❌ Course not found:", courseId);
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    console.log("📚 Course found:", {
      id: course._id,
      title: course.title,
      school: course.school,
      instructor: course.instructor
    });

    // ✅ School access validation
    if (req.user.role !== "super_admin") {
      const userSchoolId = (req.user.school?._id || req.user.school).toString();
      const courseSchoolId = (course.school?._id || course.school).toString();

      console.log("🏫 School validation:", {
        userSchoolId,
        courseSchoolId,
        match: courseSchoolId === userSchoolId
      });

      if (courseSchoolId !== userSchoolId) {
        console.log("❌ School access denied");
        return res.status(403).json({
          success: false,
          message: "Cannot access materials from course in different school",
        });
      }
    }

    let hasAccess = false;
    let materials = course.materials;

    console.log("🔐 Checking access permissions:", {
      userRole: req.user.role,
      userId: req.user._id,
      courseInstructor: course.instructor,
      isInstructor: course.instructor.toString() === req.user._id.toString()
    });

    if (["super_admin", "admin", "principal"].includes(req.user.role)) {
      hasAccess = true;
      console.log("✅ Admin/Principal access granted");
    } else if (req.user.role === "teacher") {
      hasAccess =
        course.instructor.toString() === req.user._id.toString() ||
        course.assistantInstructors.includes(req.user._id);
      console.log("👨‍🏫 Teacher access:", hasAccess);
    } else if (req.user.role === "student") {
      const Enrollment = require("../models/Enrollment");
      const enrollment = await Enrollment.findOne({
        student: req.user._id,
        course: courseId,
        status: { $in: ["active", "completed"] },
      });

      hasAccess = !!enrollment;
      console.log("🎓 Student access:", hasAccess, "enrollment:", !!enrollment);
    }

    if (!hasAccess) {
      console.log("❌ Access denied to course materials");
      return res.status(403).json({
        success: false,
        message: "Access denied to course materials",
      });
    }

    console.log("✅ Access granted, returning materials");

    materials = materials.sort((a, b) => a.order - b.order);

    res.json({
      success: true,
      data: {
        course: {
          id: course._id,
          title: course.title,
          school: course.school,
        },
        materialsCount: materials.length,
        materials,
      },
    });
  } catch (error) {
    console.error("Get materials error:", error);
    res.status(500).json({
      success: false,
      message: "Could not get materials",
      error: error.message,
    });
  }
};

// @desc    Update material
// @route   PATCH /api/courses/:courseId/materials/:materialId
// @access  Private (Course instructor or Admin/Principal)
const updateMaterial = async (req, res) => {
  try {
    const { courseId, materialId } = req.params;
    const { name, description, type, url, isRequired, order } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // ✅ School access validation
    if (req.user.role !== "super_admin") {
      const userSchoolId = (req.user.school?._id || req.user.school).toString();
      const courseSchoolId = (course.school?._id || course.school).toString();

      if (courseSchoolId !== userSchoolId) {
        return res.status(403).json({
          success: false,
          message: "Cannot update materials in course from different school",
        });
      }
    }

    const isInstructor =
      course.instructor.toString() === req.user._id.toString();
    const isAssistant = course.assistantInstructors.includes(req.user._id);
    const isAdmin = ["super_admin", "admin", "principal"].includes(
      req.user.role
    );

    if (!isInstructor && !isAssistant && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update materials",
      });
    }

    const material = course.materials.id(materialId);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Material not found",
      });
    }

    if (name !== undefined) material.name = name;
    if (description !== undefined) material.description = description;
    if (type !== undefined) material.type = type;
    if (url !== undefined) material.url = url;
    if (isRequired !== undefined) material.isRequired = isRequired;
    if (order !== undefined) material.order = order;

    if (req.file) {
      if (material.public_id) {
        try {
          await deleteFile(material.public_id);
        } catch (error) {
          console.error("Error deleting old file:", error);
        }
      }

      material.url = req.file.path;
      material.public_id = req.file.filename;
      material.size = req.file.size;
    }

    await course.save();

    res.json({
      success: true,
      message: "Material updated successfully",
      data: { material },
    });
  } catch (error) {
    console.error("Update material error:", error);
    res.status(500).json({
      success: false,
      message: "Could not update material",
      error: error.message,
    });
  }
};

// @desc    Delete material
// @route   DELETE /api/courses/:courseId/materials/:materialId
// @access  Private (Course instructor or Admin/Principal)
const deleteMaterial = async (req, res) => {
  try {
    const { courseId, materialId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // ✅ School access validation
    if (req.user.role !== "super_admin") {
      const userSchoolId = (req.user.school?._id || req.user.school).toString();
      const courseSchoolId = (course.school?._id || course.school).toString();

      if (courseSchoolId !== userSchoolId) {
        return res.status(403).json({
          success: false,
          message: "Cannot delete materials from course in different school",
        });
      }
    }

    const isInstructor =
      course.instructor.toString() === req.user._id.toString();
    const isAssistant = course.assistantInstructors.includes(req.user._id);
    const isAdmin = ["super_admin", "admin", "principal"].includes(
      req.user.role
    );

    if (!isInstructor && !isAssistant && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete materials",
      });
    }

    const material = course.materials.id(materialId);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Material not found",
      });
    }

    if (material.public_id) {
      try {
        await deleteFile(material.public_id);
      } catch (error) {
        console.error("Error deleting file:", error);
      }
    }

    course.materials.pull(materialId);
    await course.save();

    res.json({
      success: true,
      message: "Material deleted successfully",
    });
  } catch (error) {
    console.error("Delete material error:", error);
    res.status(500).json({
      success: false,
      message: "Could not delete material",
      error: error.message,
    });
  }
};

// @desc    Upload course material file
// @route   POST /api/courses/:courseId/materials/upload
// @access  Private (Course instructor or Admin/Principal)
const uploadMaterialFile = async (req, res) => {
  try {
    const { courseId } = req.params;

    // ✅ Verify course exists and user has access
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // ✅ School access validation
    if (req.user.role !== "super_admin") {
      const userSchoolId = (req.user.school?._id || req.user.school).toString();
      const courseSchoolId = (course.school?._id || course.school).toString();

      if (courseSchoolId !== userSchoolId) {
        return res.status(403).json({
          success: false,
          message: "Cannot upload materials to course from different school",
        });
      }
    }

    // ✅ Authorization check
    const isInstructor =
      course.instructor.toString() === req.user._id.toString();
    const isAssistant = course.assistantInstructors.includes(req.user._id);
    const isAdmin = ["super_admin", "admin", "principal"].includes(
      req.user.role
    );

    if (!isInstructor && !isAssistant && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to upload materials to this course",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    console.log("📤 File upload successful:", req.file);

    res.json({
      success: true,
      message: "File uploaded successfully",
      data: {
        url: req.file.path,
        public_id: req.file.filename,
        size: req.file.size,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
      },
    });
  } catch (error) {
    console.error("❌ Upload file error:", error);
    res.status(500).json({
      success: false,
      message: "File upload failed",
      error: error.message,
    });
  }
};

module.exports = {
  addMaterial,
  getMaterials,
  updateMaterial,
  deleteMaterial,
  uploadMaterialFile,
};
