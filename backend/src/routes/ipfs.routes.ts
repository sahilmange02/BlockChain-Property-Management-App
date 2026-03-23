/*
 * IPFS ROUTES: Handles document uploads to Pinata (online IPFS).
 *
 * FLOW EXPLAINED:
 * 1. User selects a file in the browser
 * 2. Browser sends the file to POST /api/ipfs/upload (this route)
 * 3. Backend receives the file in memory via Multer
 * 4. Backend uploads the file to Pinata IPFS via their API
 * 5. Pinata calculates the CID (fingerprint) and stores the file
 * 6. Backend returns the CID to the frontend
 * 7. Frontend stores the CID in React state
 * 8. When user submits the blockchain transaction, the CID is included
 * 9. The CID is stored permanently on the blockchain
 */
import { Router, Request, Response } from "express";
import multer from "multer";
import { uploadToIPFS } from "../config/ipfs.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        console.log("🔍 Multer fileFilter check:");
        console.log("  - File mimetype:", file.mimetype);
        console.log("  - File originalname:", file.originalname);

        const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
        if (allowedTypes.includes(file.mimetype)) {
            console.log("✅ File type allowed");
            cb(null, true);
        } else {
            console.log("❌ File type not allowed");
            cb(new Error("Only PDF, JPG, PNG files are allowed"));
        }
    },
});

router.post("/upload", verifyJWT, (req: Request, res: Response, next) => {
    console.log("🔍 Starting multer upload processing...");

    const multerUpload = upload.single("document");

    multerUpload(req, res, (err) => {
        if (err) {
            console.error("❌ Multer error:", err.message);
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ success: false, message: "File too large. Maximum size is 10MB." });
            }
            return res.status(400).json({ success: false, message: err.message });
        }

        console.log("✅ Multer processing complete, calling next middleware");
        next();
    });
}, async (req: Request, res: Response) => {
    console.log("🔍 IPFS Upload Debug:");
    console.log("  - Request headers:", req.headers);
    console.log("  - Request body keys:", Object.keys(req.body || {}));
    console.log("  - File received:", !!req.file);
    if (req.file) {
        console.log("  - File details:", {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            fieldname: req.file.fieldname
        });
    }

    if (!req.file) {
        console.log("❌ No file uploaded - returning 400");
        return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    console.log("✅ File validation passed, proceeding to IPFS upload...");

    try {
        const result = await uploadToIPFS(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype
        );

        console.log("✅ IPFS upload successful:", result);

        res.json({
            success: true,
            cid: result.cid,
            gatewayUrl: result.gatewayUrl,
            size: result.size,
            message: "File uploaded to IPFS successfully",
        });
    } catch (error: any) {
        console.error("❌ IPFS upload failed:", error.message);
        console.error("Full error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "IPFS upload failed"
        });
    }
});

export default router;
