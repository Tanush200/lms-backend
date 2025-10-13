const multer = require("multer");
const path = require("path");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary Storage (robust for images and documents)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folder = "messages/attachments";

    // Determine resource type and destination folder based on mimetype/extension
    const fileExtension = (file.originalname.split(".").pop() || "").toLowerCase();
    const isImage = file.mimetype.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif"].includes(fileExtension);
    const isVideo = file.mimetype.startsWith("video/") || ["mp4", "mov", "avi", "mkv"].includes(fileExtension);

    if (isImage) {
      folder = "messages/images";
    } else if (["pdf", "doc", "docx", "txt", "ppt", "pptx", "xls", "xlsx", "csv", "zip"].includes(fileExtension)) {
      folder = "messages/documents";
    }

    const params = {
      folder,
      resource_type: isImage ? "image" : isVideo ? "video" : "raw", // use raw for docs/others
      public_id: `${Date.now()}_${file.originalname.split(".")[0]}`,
    };

    // Only restrict formats for images to avoid Cloudinary 'format not allowed' on raw/video
    if (isImage) {
      params.allowed_formats = ["jpg", "jpeg", "png", "gif", "webp"];
    }

    return params;
  },
});

// File filter (accept common images and documents)
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    // images
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    // docs
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation", // pptx
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
    "text/plain",
    "text/csv",
    // archives
    "application/zip",
    "application/x-zip-compressed",
  ];

  if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("File type not allowed"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

module.exports = upload;
