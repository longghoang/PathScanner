const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const scanController = require('../app/controllers/toolcontrollers');


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); 
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Routes

router.get('/scan', scanController.scan);
router.get('/scan_results.xlsx', scanController.xlsx);
router.post('/scan/tool', upload.single('wordlist'), scanController.performScan);
router.post('/scan/stop', scanController.stop);

module.exports = router;
