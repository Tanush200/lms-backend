
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


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


const createStorage = (
  folder,
  allowedFormats = ["jpeg", "png", "jpg", "pdf", "doc", "docx"]
) => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: `school-management/${folder}`,
      allowed_formats: allowedFormats,
      transformation: [
        { width: 500, height: 500, crop: "limit" },
        { quality: "auto" },
        { fetch_format: "auto" },
      ],
    },
  });
};


const profilePhotoStorage = createStorage("profiles", ["jpeg", "png", "jpg"]);
const documentStorage = createStorage("documents", [
  "jpeg",
  "png",
  "jpg",
  "pdf",
  "doc",
  "docx",
]);
const courseContentStorage = createStorage("courses", [
  "jpeg",
  "png",
  "jpg",
  "pdf",
  "doc",
  "docx",
  "mp4",
  "mov",
]);


const uploadProfilePhoto = multer({
  storage: profilePhotoStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

const uploadDocument = multer({
  storage: documentStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

// videos
const uploadCourseContent = multer({
  storage: courseContentStorage,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});


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
