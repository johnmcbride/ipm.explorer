var timeout;
const vscode = acquireVsCodeApi();

function clickDetailOpenRepo(package,event)
{
    console.log('clickDetailOpenRepo');
    console.log(package);
    event.stopPropagation();
    console.log(vscode);
    vscode.postMessage({command: 'openrepo',itemid:'000000',message:package});  
}
function clickDetailZPMInstall(package,event)
{
    console.log(clickDetailZPMInstall);
    console.log(package);
    event.stopPropagation();
    vscode.postMessage({command: 'copyclipboard',itemid:'000000',message:package});  
}
function showDetailPopup()
{
    vscode.postMessage({command: 'popup',itemid:'000000',message:'this is a hover test'});
}
  