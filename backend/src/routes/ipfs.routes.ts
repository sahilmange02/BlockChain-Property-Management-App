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
        const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only PDF, JPG, PNG files are allowed"));
        }
    },
});

router.post("/upload", verifyJWT, upload.single("document"), async (req: Request, res: Response) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const result = await uploadToIPFS(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
    );

    res.json({
        success: true,
        cid: result.cid,
        gatewayUrl: result.gatewayUrl,
        size: result.size,
        message: "File uploaded to IPFS successfully",
    });
});

export default router;
