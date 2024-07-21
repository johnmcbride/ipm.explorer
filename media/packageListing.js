var timeout;
const vscode = acquireVsCodeApi();

function clickOpenRepo(package)
{
    vscode.postMessage({command: 'openrepo',itemid:'000000',message:package});  
}
function clickZPMInstall(package,event)
{
    event.stopPropagation();
    vscode.postMessage({command: 'copyclipboard',itemid:'000000',message:package});  
}
function loadWebviewPanel()
{

}
function test()
{
    vscode.postMessage({command: 'popup',itemid:'000000',message:'this is a test'});
}
function clickIPMPackage(package)
{
    vscode.postMessage({command: 'ipmpackageclicked',itemid:'000000',message:package});
}
function showPopup()
{
    vscode.postMessage({command: 'popup',itemid:'000000',message:'this is a hover test'});
//   timeout = setTimeout(function(){ 
//     vscode.postMessage({command: 'popup',itemid:'000000',message:'this is a hover test'});
//     console.log("popup");
//  }, 1000);
}
function closePopup()
{
  clearTimeout(timeout);
  console.log('close');
}

function loadPackages() {
    fetch('https://pm.community.intersystems.com/packages/-/all')
      .then((response) => response.json())
      .then((packages) => {
        var pmList = document.getElementById('pm1'); //get li
        packages.map((package) => {
            var newDiv = document.createElement('div');
            newDiv.innerHTML = `<div class="package">
            <img src="/packageipm.svg" class="packageimage" />
            <div style="margin: 2px 0 0 0">
                <div class="title">${package.name}</div>
                    <div class="description">
                    ${package.description}
                    </div>
                </div>
            </div>`;
            pmList.appendChild(newDiv);
        });
    });
}
  