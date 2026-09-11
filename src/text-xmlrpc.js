process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION:', reason);
});

console.log('--- STARTING XML-RPC TEST ---');

let xmlrpc;
try {
    xmlrpc = require('xmlrpc');
    console.log('1. xmlrpc module loaded successfully.');
} catch (e) {
    console.error('FAILED TO REQUIRE MODULE:', e.message);
    process.exit(1);
}

const client = xmlrpc.createClient({
    host: '127.0.0.1',
    port: 80,
    path: '/revive/www/api/v2/xmlrpc/index.php',
});

console.log('2. Sending xmlrpc.logon call to 127.0.0.1...');

client.methodCall('xmlrpc.logon', ['admin', 'your_admin_password'], (error, value) => {
    console.log('3. Callback reached.');
    if (error) {
        console.error('--- CALL FAILED ---');
        console.log(error);
    } else {
        console.log('--- SUCCESS! SESSION ID: ---');
        console.log(value);
    }
});