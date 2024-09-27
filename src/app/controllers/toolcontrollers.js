const fs = require('fs');
const axios = require('axios');

class ToolController {
    async scan(req, res,next) {
        try {
            res.render('tools/main');
        } catch (error) {
            next(error);
        }
    }

    async performScan(req, res) {
      const baseUrl = req.body.baseUrl; 
      const wordlistFilePath = req.file.path; 
  
      try {
          const fileContent = fs.readFileSync(wordlistFilePath, 'utf-8');
          const paths = fileContent.split('\n').map(path => path.trim()).filter(Boolean);
          const results = [];
  
          for (const path of paths) {
              const fullUrl = `${baseUrl}/${path}`;
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
                          status: 'Không nhận được phản hồi từ server',
                          length: 0
                      });
                  }
              }
          }
  
          fs.unlinkSync(wordlistFilePath);
  
          // Render view with structured results
          res.render('tools/results', { results });
      } catch (error) {
          console.error(error);
          res.status(500).send('Có lỗi xảy ra khi quét.');
      }
  }
}

module.exports = new ToolController();
