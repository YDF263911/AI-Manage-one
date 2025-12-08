// 简单的测试
import analysisRouter from './src/routes/analysis.js';
import express from 'express';

const app = express();
app.use(express.json());
app.use('/api/analysis', analysisRouter);

app.listen(3001, () => {
  console.log('Test server running on 3001');
  
  setTimeout(async () => {
    try {
      const response = await fetch('http://localhost:3001/api/analysis/analyze/9b8a0176-859a-4a0f-b735-dafde2d48fc2', {
        method: 'POST',
        headers: {
          'x-user-id': 'af7decf3-98ad-44c4-95ab-d3bd36cb5b6f',
          'content-type': 'application/json'
        },
        body: '{}'
      });
      
      console.log('Status:', response.status);
      const text = await response.text();
      console.log('Response:', text.substring(0, 500));
      
      process.exit(0);
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  }, 2000);
});