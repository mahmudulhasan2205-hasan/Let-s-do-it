import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';
import { ApiError } from './ApiError.js';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const cloudinaryUpload = async (localFilePath) => {
    if (!localFilePath) return null;

    try {
        return await cloudinary.uploader.upload(localFilePath, {resource_type: 'auto'});
    } catch (error) {
        console.error("Cloudinary upload failed:", error.http_code || error.name || "unknown error");
        throw new ApiError(
            502,
            "Image upload failed. Check the server's Cloudinary configuration and try again."
        );
    } finally {
        try {
            if (fs.existsSync(localFilePath)) {
                fs.unlinkSync(localFilePath);
            }
        } catch (error) {
            console.error("Failed to remove temporary upload:", error.code || error.name || "unknown error");
        }
    }
}

const cloudinaryVideoUpload = async (localFilePath) => {
    if (!localFilePath) return null;

    try {
        return await cloudinary.uploader.upload_large(localFilePath, {
            resource_type: "video",
            chunk_size: 6 * 1024 * 1024
        });
    } catch (error) {
        console.error("Cloudinary video upload failed:", error.http_code || error.name || "unknown error");
        throw new ApiError(
            502,
            "Video upload failed. Check the server's Cloudinary configuration and try again."
        );
    } finally {
        try {
            if (fs.existsSync(localFilePath)) {
                fs.unlinkSync(localFilePath);
            }
        } catch (error) {
            console.error("Failed to remove temporary upload:", error.code || error.name || "unknown error");
        }
    }
}

const deleteCloudinaryVideo = async (publicId) => {
    if (!publicId) {
        throw new ApiError(
            502,
            "The short video exceeds 60 seconds and could not be removed from storage."
        );
    }

    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: "video"
        });
        if (result.result !== "ok" && result.result !== "not found") {
            throw new Error("Cloudinary did not confirm video deletion");
        }
    } catch (error) {
        console.error("Cloudinary video cleanup failed:", error.http_code || error.name || "unknown error");
        throw new ApiError(
            502,
            "The short video exceeds 60 seconds and could not be removed from storage."
        );
    }
}

export {
    cloudinaryUpload as uploadOnCloudinary,
    cloudinaryVideoUpload as uploadVideoOnCloudinary,
    deleteCloudinaryVideo
}