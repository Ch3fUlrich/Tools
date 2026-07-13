const fs = require('fs');

const extractScripts = () => {
    const html = fs.readFileSync('frontend/public/timeline/timeline.html', 'utf8');
    const scripts = html.match(/<script src="([^"]+)"><\/script>/g);
    console.log("Current script tags:", scripts);
}
extractScripts();
