
// const cloudinary = require("cloudinary").v2;
// const { CloudinaryStorage } = require("multer-storage-cloudinary");
// const multer = require("multer");

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });


// const testCloudinaryConnection = async () => {
//   try {
//     const result = await cloudinary.api.ping();
//     console.log("☁️ Cloudinary connected successfully:", result.status);
//     return true;
//   } catch (error) {
//     console.error("❌ Cloudinary connection failed:", error.message);
//     return false;
//   }
// };


// const createStorage = (
//   folder,
//   allowedFormats = ["jpeg", "png", "jpg", "pdf", "doc", "docx"]
// ) => {
//   return new CloudinaryStorage({
//     cloudinary: cloudinary,
//     params: {
//       folder: `school-management/${folder}`,
//       allowed_formats: allowedFormats,
//       transformation: [
//         { width: 500, height: 500, crop: "limit" },
//         { quality: "auto" },
//         { fetch_format: "auto" },
//       ],
//     },
//   });
// };


// const profilePhotoStorage = createStorage("profiles", ["jpeg", "png", "jpg"]);
// const documentStorage = createStorage("documents", [
//   "jpeg",
//   "png",
//   "jpg",
//   "pdf",
//   "doc",
//   "docx",
// ]);
// const courseContentStorage = createStorage("courses", [
//   "jpeg",
//   "png",
//   "jpg",
//   "pdf",
//   "doc",
//   "docx",
//   "mp4",
//   "mov",
// ]);


// const uploadProfilePhoto = multer({
//   storage: profilePhotoStorage,
//   limits: {
//     fileSize: 5 * 1024 * 1024,
//   },
// });

// const uploadDocument = multer({
//   storage: documentStorage,
//   limits: {
//     fileSize: 10 * 1024 * 1024,
//   },
// });

// // videos
// const uploadCourseContent = multer({
//   storage: courseContentStorage,
//   limits: {
//     fileSize: 100 * 1024 * 1024,
//   },
// });


// const deleteFile = async (publicId) => {
//   try {
//     const result = await cloudinary.uploader.destroy(publicId);
//     console.log("🗑️ File deleted from Cloudinary:", publicId);
//     return result;
//   } catch (error) {
//     console.error("❌ Error deleting file from Cloudinary:", error);
//     throw error;
//   }
// };

// module.exports = {
//   cloudinary,
//   uploadProfilePhoto,
//   uploadDocument,
//   uploadCourseContent,
//   deleteFile,
//   testCloudinaryConnection,
// };



// config/cloudinary.js - ENHANCED VERSION
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Test Cloudinary connection
const testCloudinaryConnection = async () => {
  try {
    const result = await cloudinary.api.ping();
    console.log("☁️ Cloudinary connected successfully:", result.status);
    return true;
  } catch (error) {
    console.error("❌ Cloudinary connection failed:", error.message);
    return false;
  }
};

// ✅ Enhanced storage configuration for all file types
const createStorage = (
  folder,
  allowedFormats
) => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
      // ✅ Determine resource type based on file mime type
      let resourceType = 'auto';
      if (file.mimetype.startsWith('video/')) {
        resourceType = 'video';
      } else if (file.mimetype.startsWith('image/')) {
        resourceType = 'image';
      } else {
        resourceType = 'raw'; // ✅ For PDFs, docs, etc.
      }

      const params = {
        folder: `school-management/${folder}`,
        resource_type: resourceType, // ✅ Dynamic resource type
        // ✅ Only apply image transformations for images
        transformation: file.mimetype.startsWith('image/') ? [
          { width: 1000, height: 1000, crop: "limit" },
          { quality: "auto" },
          { fetch_format: "auto" },
        ] : undefined,
      };

      // ✅ Only restrict formats when explicitly provided
      if (Array.isArray(allowedFormats) && allowedFormats.length > 0) {
        params.allowed_formats = allowedFormats;
      }

      return params;
    },
  });
};

// ✅ Specific storage configurations
const profilePhotoStorage = createStorage("profiles", ["jpeg", "png", "jpg", "webp"]);
const documentStorage = createStorage("documents", ["jpeg", "png", "jpg", "pdf", "doc", "docx"]);
const courseContentStorage = createStorage("courses"); // ✅ Allow all file types (no allowed_formats restriction)

// ✅ Multer configurations with better error handling
const uploadProfilePhoto = multer({
  storage: profilePhotoStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for profile photos'), false);
    }
  },
});

const uploadDocument = multer({
  storage: documentStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/', 'application/pdf', 'application/msword', 
                         'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (allowedTypes.some(type => file.mimetype.includes(type))) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  },
});

// ✅ Enhanced course content upload (for materials)
const uploadCourseContent = multer({
  storage: courseContentStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter: (req, file, cb) => {
    console.log('📁 Uploading file:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    // ✅ Allow most common file types
    const allowedTypes = [
      'image/',
      'video/',
      'audio/',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument',
      'text/',
      'application/zip',
      'application/x-zip-compressed'
    ];
    
    if (allowedTypes.some(type => file.mimetype.includes(type))) {
      cb(null, true);
    } else {
      console.warn('⚠️ File type not allowed:', file.mimetype);
      cb(new Error(`File type ${file.mimetype} is not allowed`), false);
    }
  },
});

// ✅ Delete file function with better error handling
const deleteFile = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log("🗑️ File deleted from Cloudinary:", publicId);
    return result;
  } catch (error) {
    console.error("❌ Error deleting file from Cloudinary:", error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  uploadProfilePhoto,
  uploadDocument,
  uploadCourseContent,
  deleteFile,
  testCloudinaryConnection,
};
