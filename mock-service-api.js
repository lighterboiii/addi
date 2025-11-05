const express = require('express');
const fs = require('fs').promises;
const path = require('path');
ы
const app = express();
const PORT = 10000;
const LOG_FILE = 'simple-mock.log';
// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
// Глобальные переменные для управления поведением
let responseConfig = {
    statusCode: 200,
    responseBody: { success: true, message: "Request processed successfully" },
    responseDelay: 0
};
// Функция логирования
async function logToFile(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;

    try {
        await fs.appendFile(LOG_FILE, logMessage);
        console.log(`📝 log: ${message}`);
    } catch (error) {
        console.error('Ошибка логирования:', error);
    }
}
// Основной endpoint для приема данных
app.post('/api/data', async (req, res) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    // Логируем заголовки, тело запроса
    await logToFile(`📥 REQUEST ${requestId}:`);
    await logToFile(`   Headers: ${JSON.stringify(req.headers)}`);
    await logToFile(`   Body: ${JSON.stringify(req.body, null, 2)}`);
    // Имитируем задержку если нужно
    if (responseConfig.responseDelay > 0) {
        await logToFile(`   ⏳ Delaying response by ${responseConfig.responseDelay}ms`);
        await new Promise(resolve => setTimeout(resolve, responseConfig.responseDelay));
    }
    // Отправляем сконфигурированный ответ
    await logToFile(`📤 Ответ ${requestId}: Статус ${responseConfig.statusCode}, Body: ${JSON.stringify(responseConfig.responseBody)}`);

    res.status(responseConfig.statusCode).json(responseConfig.responseBody);
});
// Endpoint для управления поведением мока
app.post('/mock/control', async (req, res) => {
    const { statusCode, responseBody, responseDelay } = req.body;

    if (statusCode) {
        responseConfig.statusCode = statusCode;
    }

    if (responseBody) {
        responseConfig.responseBody = responseBody;
    }

    if (responseDelay !== undefined) {
        responseConfig.responseDelay = responseDelay;
    }

    await logToFile(`🎛️ MOCK CONTROL UPDATED: ${JSON.stringify(responseConfig)}`);

    res.json({
        message: 'Mock configuration updated',
        config: responseConfig
    });
});
// Endpoint для проверки статуса
app.get('/mock/status', (req, res) => {
    res.json({
        status: 'running',
        timestamp: new Date().toISOString(),
        config: responseConfig
    });
});
// Endpoint для просмотра логов
app.get('/mock/logs', async (req, res) => {
    try {
        const logs = await fs.readFile(LOG_FILE, 'utf8');
        res.type('text/plain').send(logs);
    } catch (error) {
        res.status(404).json({ error: 'Log file not found' });
    }
});
// Endpoint для очистки логов
app.delete('/mock/logs', async (req, res) => {
    try {
        await fs.writeFile(LOG_FILE, '');
        await logToFile('🧹 LOGS CLEARED');
        res.json({ message: 'Logs cleared successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear logs' });
    }
});
// GET endpoint - минимальное логирование
app.get('*', (req, res) => {
    logToFile(`🔍 GET REQUEST: ${req.path}`);

    res.json({
        message: "Mock API is running",
        path: req.path,
        timestamp: new Date().toISOString()
    });
});
// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Simple Mock API Server running on ${PORT}`);
    console.log(`📝 Log file: ${LOG_FILE}`);
    console.log('\n📋 Available endpoints:');
    console.log('📥 POST /api/data            - Main data endpoint');
    console.log('📊 GET  /mock/status         - Check mock status');
    console.log('📄 GET  /mock/logs           - View logs');
    console.log('🧹 DELETE /mock/logs         - Clear logs');
    console.log('\n⚙️  Default configuration:');
    console.log(`Status: ${responseConfig.statusCode}`);
    console.log(`Delay: ${responseConfig.responseDelay}ms`);
});
// Обработка graceful shutdown
process.on('SIGINT', async () => {
    await logToFile('🛑 Server shutdown');
    console.log('\n🛑 Mock server stopped');
    process.exit(0);
});