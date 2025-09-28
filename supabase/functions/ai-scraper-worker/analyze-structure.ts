// analyze-structure.ts
console.log(' Analyzing function structure...');

// Read the file to understand the structure
const content = await Deno.readTextFile('./index.ts');
console.log('File size:', content.length, 'characters');

// Look for common patterns
const patterns = {
    serve: content.includes('serve('),
    exportDefault: content.includes('export default'),
    exportHandler: content.includes('export.*handler'),
    mainFunction: content.match(/function\s+main\s*\(/),
    asyncHandler: content.match(/async\s+function\s+\w+\s*\(/),
};

console.log(' Structure analysis:');
for (const [pattern, exists] of Object.entries(patterns)) {
    console.log(  :, exists);
}

// Try different import approaches
try {
    const module = await import('./index.ts');
    console.log('\n Successful import');
    console.log('Exports:', Object.keys(module));
} catch (error) {
    console.log('\n Import error:', error.message);
}
