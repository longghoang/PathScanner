const fs = require('fs');
const axios = require('axios');
const yargs = require('yargs');

// Chuyển từ UI sang Command-line
let isScanning = false;

// Xử lý tham số dòng lệnh
const argv = yargs
    .option('url', {
        alias: 'u',
        description: 'Base URL to scan',
        type: 'string',
        demandOption: true
    })
    .option('wordlist', {
        alias: 'w',
        description: 'Path to the wordlist file',
        type: 'string',
        demandOption: true
    })
    .option('threatLevel', {
        alias: 't',
        description: 'Number of requests per second',
        type: 'number',
        default: 10
    })
    .help()
    .alias('help', 'h')
    .argv;

const baseUrl = argv.url;
const wordlistFilePath = argv.wordlist;
const threatLevel = argv.threatLevel;

// Perform the scan
async function performScan() {
    try {
        const fileContent = fs.readFileSync(wordlistFilePath, 'utf-8');
        const paths = fileContent.split('\n').map(path => path.trim()).filter(Boolean);
        const totalPaths = paths.length; // Tổng số lượng đường dẫn cần quét

        const results = [];
        isScanning = true;

        for (let i = 0; i < paths.length; i++) {
            if (!isScanning) break;

            const fullUrl = `${baseUrl}/${paths[i]}`;
            try {
                const response = await axios.get(fullUrl);
                results.push({
                    url: fullUrl,
                    status: response.status,
                    length: response.data.length
                });
            } catch (error) {
                if (error.response) {
                    results.push({
                        url: fullUrl,
                        status: error.response.status,
                        length: error.response.data.length
                    });
                } else {
                    results.push({
                        url: fullUrl,
                        status: 'No response',
                        length: 0
                    });
                }
            }

            // In kết quả
            console.log(`      Scanned: ${fullUrl} - Status: ${results[i].status} - Length: ${results[i].length}`);

            // Tính toán và hiển thị tiến trình
            const progress = Math.round(((i + 1) / totalPaths) * 100); 
            process.stdout.write(`\rProgress: (${i + 1}/${totalPaths}) ${progress}%`); 

            await new Promise(resolve => setTimeout(resolve, 1000 / threatLevel));
        }

        
        console.log('\nScan completed.');

    } catch (error) {
        console.error('Error during the scan:', error);
    } finally {
        isScanning = false;
    }
}

// Chạy tool
performScan();
