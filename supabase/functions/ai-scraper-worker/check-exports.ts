// check-exports.ts
const module = await import('./index.ts');
console.log(' Available exports:', Object.keys(module));
console.log(' Export details:');
for (const [key, value] of Object.entries(module)) {
    console.log(  :, typeof value);
}
