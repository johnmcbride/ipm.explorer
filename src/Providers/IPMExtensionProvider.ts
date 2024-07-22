// import { CustomPromisifyLegacy } from './../../node_modules/@types/node/util.d';
import { PackageManager } from './../Models/PackageManager';
import * as vscode from 'vscode';
import axios from 'axios';
import { IPMPackage } from '../Interfaces/IPMPackage';
import * as path from 'path';
import { Package } from '../Models/Package';
import { Base64 } from 'js-base64';
import { IPMSetting } from '../Interfaces/IPMSetting';
import { throws } from 'assert';
import { ContentTypeError } from '../Classes/CustomErrors';

export class IPMExtensionProvider implements vscode.WebviewViewProvider
{
    private _view?: vscode.WebviewView;
	private _ipmInfoWebViewPanel?:vscode.WebviewPanel;
	private pmManagers:Array<PackageManager>;

	constructor(
		private readonly _extensionUri: vscode.Uri,	
	) 
    { 
		this.pmManagers = new Array<PackageManager>();
	}
	public async loadManagers()
	{
		//Get the IPM configuration section of the settings file
		var configs = vscode.workspace.getConfiguration('ipm').get<Array<string>>("repositories");
		//check if there are any repositories configured. If there are not any
		//configured then show a VS Code informational message to the user
		if ( configs!.length === undefined)
		{
			//Show info message to the user
			vscode.window.showInformationMessage("You do not have any IPM repositories configured. Please open settings and configure a IPM respository")
		}
		else
		{
			//Loop through each IPM repository defined in the settings and load
			//then into a list of IPMSetting classes
			for ( let repoCounter=0;repoCounter<configs!.length;repoCounter++)
			{
				//log the item to the console for any debugging purposes
				// console.log(JSON.stringify(configs![repoCounter]));
				//Convert the repo object to a JSON String so we can load it
				//into a class object 
				let config:string = JSON.stringify(configs![repoCounter]);
				//Parse the json string into a strongly typeed IPMSetting class
				let pm:IPMSetting = JSON.parse(config);
				//log the package manager name defined in the setting file.
				// console.log(pm.name);

				//Get a list of packages from the configured URL. this is a
				//private internal method that is awaitable. This will be loaded
				//into a Array of IPMPackage objects
				try
				{
					let pmPackages:Array<IPMPackage> = await this.getPackages(pm.url);
					//Create a new package manager object with the name, url and a list
					//of packages we retrieved from the URL
					let pManager = new PackageManager(pm.name,pm.url,pmPackages);
					//add the new package manager object to the PackageManagers list
					//this is what will be displayed in the webview extension
					this.pmManagers?.push(pManager);
				}
				//Catch any errors coming back from the get request for packages
				catch ( error )
				{
					//check to see if this is an instamce of our custom error object
					//we can generate custom error object to handle the different types of
					//errors
					if ( error instanceof ContentTypeError)
					{
						//Error is an invalid content type returned
						//so display an error popup to the user via the vscode API.
						vscode.window.showErrorMessage(error.message);
					}					
				}
			}	
		}
	}
	//Method to get a list of packages from the passed in URL
	private async getPackages(url:string):Promise<Array<IPMPackage>>
	{
		try
		{
			//check if the URL ends with a /, if it doesn't then add it
			var url = url.lastIndexOf("/") === (url.length -1) ? url : url += "/";
			//call the url to get a list of packages back as JSON format.
			let packagesResponse = await axios.get(`${url}packages/-/all`);
			// console.log(packagesResponse.headers["content-type"]);
			//check if the content type is what we expect application/json
			if ( packagesResponse.headers["content-type"].indexOf("application/json") > -1 )
			{
				//if the content type is application/json, then we have the response
				//we expect. Load the returned packages into a array of IPMPackage
				let packages:Array<IPMPackage> = packagesResponse.data;
				//return the list
				return packages;
			}
			else
			{
				//We did not get a valid content type. Throw an error
				throw("Did not get a valid json response");
			}
		}
		catch ( error )
		{
			//Some type of error occurred, let's throw our custom content type error
			//error type.
			// console.log(error);
			throw(new ContentTypeError(
				{
					name: 'INVALID_RESPONSE_CONTENTTYPE',
					message: `Received wrong content type from the repository\n${url}/packages/-/all`,
					cause:error
				}
			));
		}	
	}
	//Create the webview to show the custom list of packages
    async resolveWebviewView(
        webviewView: vscode.WebviewView, 
        context: vscode.WebviewViewResolveContext, 
        token: vscode.CancellationToken): Promise<void>
    {
        this._view = webviewView;

		//set a couple of custom options. Enable scripts, and the local resource
		//location so we can include out custom scripts/css etc.
		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,
			localResourceRoots: [
				this._extensionUri
			]
		};

		//setup a custom receive message to be able to listen for events
		//spawned from the webview. This is the way we can communicate from
		//webview to the host VSCode environment.
		webviewView.webview.onDidReceiveMessage(message => {
			//check for which command is coming into the method
			switch ( message.command)
			{
				// copy the package info onto the clipboard
				case "copyclipboard":
					//get the package passed to this method
					let sentPackage:IPMPackage = JSON.parse(Base64.decode(message.message));
					//copy the ZPM install command to the clipboard so the user can
					//open the terminal and paste the command into it
					vscode.env.clipboard.writeText(`ZPM install ${sentPackage.name}`);
					//show message to user
					vscode.window.showInformationMessage("Copied ZPM to clipboard \n\n Open IRIS terminal and Paste");
					break;
				//popup message: We should display the info message to the user
				case "popup":
					// vscode.window.showInformationMessage(message.message);
					break;
				case "ipmpackageclicked":
					//a package was clicked. Get the package info from the message
					//object
					let p:IPMPackage = JSON.parse(Base64.decode(message.message));
					//check if we already have a webpanel opened/defined. If we do then change
					//the content, if we don't create a new one and add the content.
					if ( this._ipmInfoWebViewPanel === undefined)
					{
						//we don't have a webpanel defined so let's create one
						//set the name to be the package name, enable scripts and
						//set the resource root for scripts/css
						this._ipmInfoWebViewPanel = vscode.window.createWebviewPanel(
							"ipm_package_info",
							p.name,
							vscode.ViewColumn.One,
							{
								// Allow scripts in the webview
								enableScripts: true,
								localResourceRoots: [
									this._extensionUri
								]
							}
						);
						//setup the receive messages for the webview panel
						this._ipmInfoWebViewPanel?.webview.onDidReceiveMessage(message => {
							switch ( message.command)
							{
								case "openrepo":
									let copyPackage:IPMPackage = JSON.parse(Base64.decode(message.message));
									vscode.env.openExternal(vscode.Uri.parse(copyPackage.repository));
									break;
								// copy the package info onto the clipboard
								case "copyclipboard":
									//get the package passed to this method
									let sentPackage:IPMPackage = JSON.parse(Base64.decode(message.message));
									//copy the ZPM install command to the clipboard so the user can
									//open the terminal and paste the command into it
									vscode.env.clipboard.writeText(`ZPM install ${sentPackage.name}`);
									//show message to user
									vscode.window.showInformationMessage("Copied ZPM to clipboard \n\n Open IRIS terminal and Paste");
									break;
								//popup message: We should display the info message to the user
								case "popup":
									vscode.window.showInformationMessage(message.message);
									break;
								default:
									break;
							}
						});
						//clean up if user closes the web view panel
						this._ipmInfoWebViewPanel.onDidDispose(() => {
							//set to undefined so the next time a package clicks happens
							//the web view panel will show again
							this._ipmInfoWebViewPanel = undefined;
						});
					}
					//Set the title of an existing webpanel to be the package name
					this._ipmInfoWebViewPanel.title = p.name;
					//set the webview html
					this._ipmInfoWebViewPanel.webview.html = this.getHtmlPackageDetails(webviewView.webview,p);
					break;
				default:
					break;
			}
		});
		
		//set the webview html for the complete package listing
		webviewView.webview.html = this.getHtmlForPackageManagers(webviewView.webview,this.pmManagers);
        // webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        // webviewView.webview.html = await this.getHtmlForPackageListing(webviewView.webview,configs!);    
    }
    private getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
	//method for generating HTML. Receive a webview and the packagemanagers array
	private getHtmlForPackageManagers(webview: vscode.Webview,PackageManagers:Array<PackageManager>)
	{
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'packageListing.js'));

		// Do the same for the stylesheet.
		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'styles.css'));
		//set the url for the packageipm svg file
		const imageUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'packageipm.svg'));
		//set the url for the codicons package
		const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css'));
		//set the url for the github mark
		const githubUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'github-mark.svg'));
		//set the user for the vs code elements package
		const vsCodeElementsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'node_modules/@vscode-elements/elements/dist','bundled.js'));
		
		// Use a nonce to only allow a specific script to be run.
		const nonce = this.getNonce();

		//build the HTML by looping through the package manamgers list that
		//we passed in
		let html:string = `<!DOCTYPE html>
		<html lang="en">
		<head>
		   <meta name="viewport" content="width=device-width, initial-scale=1.0">
		   <link rel="stylesheet" href="${styleUri}" />
		   <link href="${codiconsUri}" rel="stylesheet" />
		   <script nonce="${nonce}" src="${scriptUri}"></script>
		   <script src="${vsCodeElementsUri}" type="module"></script>
		</head>
		<body>
			<div>`;
			PackageManagers.forEach(pm => {
				html += `<vscode-collapsible title="${pm.name}">`;
				html += `<div id="pm${pm.name}">`;
				pm.packages?.forEach(p => {
					html += `<div onClick="clickIPMPackage('${Base64.encode(JSON.stringify(p))}')">`;
					html += `	<div class="package">`;
					html += `		<img src="${imageUri}" class="packageimage" />`;
					html += `		<div class='details'>`;
					html += `			<div class="title">${p.name}</div>`;
					html += `			<div class="description ellipsis">`;
					html += `				${p.description}`;
					html += `			</div>`;
					html += `			<div class="actiondetails">`;
					html += `			<span class='codicon codicon-github logo'></span>`;
					html += `			<vscode-button id="button-copyzpm" class="custombutton" onClick="clickZPMInstall('${Base64.encode(JSON.stringify(p))}',event)">Copy ZPM</vscode-button>`;
					html += `			</div>`;
					html += `		</div>`;
					html += `	</div>`;
					html += `</div>`;
				});
				html += `</div>`;
				html += `</vscode-collapsible>`;
			});
			html += `</div>`;
			html += `</body>`;
			html += `</html>`;
	   html += `</div>`;
	   html += `</body>`;
	   html += `</html>`;

	   return html;
	}
	//Generate html for a specific package
	private getHtmlPackageDetails(webview: vscode.Webview, packageObj:IPMPackage)
	{
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'detailPackageListing.js'));

		// Do the same for the stylesheet.
		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'styles.css'));
		//set the url for the packageipm svg file
		const imageUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'packageipm.svg'));
		//set the url for the codicons package
		const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css'));
		//set the url for the github mark
		const githubUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'github-mark.svg'));
		//set the user for the vs code elements package
		const vsCodeElementsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'node_modules/@vscode-elements/elements/dist','bundled.js'));
		
		// Use a nonce to only allow a specific script to be run.
		const nonce = this.getNonce();
		
		//set the html for the package details
		let html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Home</title>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
	<link rel="stylesheet" href="${styleUri}" />
	<link href="${codiconsUri}" rel="stylesheet" />
	<script nonce="${nonce}" src="${scriptUri}"></script>
	<script src="${vsCodeElementsUri}" type="module"></script>
  </head>
  <body>
  <div class="extensiondets">
      <div class="header">
        <div class="icon-container">
          <img src="${imageUri}" width="150px" />
        </div>
        <div class="details">
          <div class="title">${packageObj.name}</div>
          <div class="subtitle">
		  	<span class='codicon codicon-github'></span>
			<vscode-button id="button-openrepo" onClick=clickDetailOpenRepo('${Base64.encode(JSON.stringify(packageObj))}',event)>Open Repo</vscode-button>
			<vscode-button id="button-copy-installerzpm" onClick=clickDetailZPMInstall('${Base64.encode(JSON.stringify(packageObj))}',event)>Copy ZPM</vscode-button>
		  </div>
          <div class="description">${packageObj.description}</div>
        </div>
      </div>
      <div class="body">
        <vscode-tabs selected-index="0">
          <vscode-tab-header slot="header">Details</vscode-tab-header>
          <vscode-tab-panel>
            <p>${packageObj.description}</p>
          </vscode-tab-panel>
          <vscode-tab-header slot="header"> Author </vscode-tab-header>
          <vscode-tab-panel>
            <p>${packageObj.origin}</p>
          </vscode-tab-panel>
          <vscode-tab-header slot="header">Repository</vscode-tab-header>
          <vscode-tab-panel>
            <p>
			<div class='codicon codicon-github'></div>
			<a href="${packageObj.repository}">${packageObj.repository}</a>
			</p>
          </vscode-tab-panel>
          <vscode-tab-header slot="header">Change Log</vscode-tab-header>
          <vscode-tab-panel>
            <p></p>
          </vscode-tab-panel>
          <vscode-tab-header slot="header">Versions</vscode-tab-header>
          <vscode-tab-panel>
            <p><ul>`;
		packageObj.versions.forEach(version => {
			html += `<li>${version}</li>`;
		});
		html +=`	</ul></p>
          </vscode-tab-panel>
        </vscode-tabs>
      </div>
    </div>
  </body>
</html>
`;
return html;
	}
}