import * as vscode from 'vscode';

// Global variables
let andrewStatusBarItem: vscode.StatusBarItem;
let errorCount: number = 0;
let andrewWebviewViewProvider: AndrewWebviewViewProvider;

export function activate(context: vscode.ExtensionContext) {
    console.log('La extensión Andrew\'s voidErrors está ahora activa');

    // Crear el item de la barra de estado
    andrewStatusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    
    andrewStatusBarItem.command = 'andrews-voiderrors.showAndrewPanel';
    context.subscriptions.push(andrewStatusBarItem);

    // Registrar el webview view provider para la sidebar
    andrewWebviewViewProvider = new AndrewWebviewViewProvider(context.extensionUri);
    
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'andrews-voiderrors.andrewView',
            andrewWebviewViewProvider
        )
    );

    // Actualizar inicialmente
    updateAndrewStatus();

    // Escuchar cambios en los diagnósticos (errores)
    context.subscriptions.push(
        vscode.languages.onDidChangeDiagnostics(updateAndrewStatus)
    );

    // Escuchar cambios de documento activo
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(updateAndrewStatus)
    );

    // Registrar comando para mostrar panel de Andrew
    const showAndrewPanelCommand = vscode.commands.registerCommand('andrews-voiderrors.showAndrewPanel', () => {
        // Enfocar la vista de Andrew
        vscode.commands.executeCommand('andrews-voiderrors.andrewView.focus');
    });

    context.subscriptions.push(showAndrewPanelCommand);

    // Mostrar mensaje de activación
    vscode.window.showInformationMessage('Andrew está vigilando tu código 👁️');
}

function updateAndrewStatus(): void {
    errorCount = getTotalErrorCount();
    const andrewState = getAndrewState(errorCount);
    
    andrewStatusBarItem.text = andrewState.statusBarText;
    andrewStatusBarItem.tooltip = `Andrew dice: "${andrewState.message}"\nErrores: ${errorCount}`;
    andrewStatusBarItem.backgroundColor = andrewState.backgroundColor;
    
    // Actualizar la webview si existe
    if (andrewWebviewViewProvider) {
        andrewWebviewViewProvider.updateContent(errorCount);
    }
    
    // Mostrar u ocultar según configuración
    const config = vscode.workspace.getConfiguration('andrewsVoiderrors');
    if (config.get('showInStatusBar', true)) {
        andrewStatusBarItem.show();
    } else {
        andrewStatusBarItem.hide();
    }
}

function getTotalErrorCount(): number {
    let totalErrors = 0;
    
    // Contar errores en todos los documentos abiertos
    vscode.workspace.textDocuments.forEach(document => {
        const diagnostics = vscode.languages.getDiagnostics(document.uri);
        diagnostics.forEach(diagnostic => {
            if (diagnostic.severity === vscode.DiagnosticSeverity.Error) {
                totalErrors++;
            }
        });
    });

    return totalErrors;
}

interface AndrewState {
    statusBarText: string;
    message: string;
    backgroundColor?: vscode.ThemeColor;
    imageName: string;
}

function getAndrewState(errorCount: number): AndrewState {
    if (errorCount === 0) {
        return {
            statusBarText: '$(heart) Andrew euforico',
            message: '¡Código perfecto!',
            backgroundColor: new vscode.ThemeColor('statusBarItem.successBackground'),
            imageName: 'andreseuforico'
        };
    } else if (errorCount <= 2) {
        return {
            statusBarText: '$(warning) Andrew feliz ¿?',
            message: 'Algunos errores...',
            backgroundColor: new vscode.ThemeColor('statusBarItem.warningBackground'),
            imageName: 'andresfeliz'
        };
    } else if (errorCount <= 4) {
        return {
            statusBarText: '$(error) Andrew xd',
            message: 'Varios errores detectados',
            backgroundColor: new vscode.ThemeColor('statusBarItem.errorBackground'),
            imageName: 'andresxd'
        };
    } else if (errorCount <= 6) {
        return {
            statusBarText: '$(warning) Andrew xd sad ¿?',
            message: 'Muchos errores...',
            backgroundColor: new vscode.ThemeColor('statusBarItem.warningBackground'),
            imageName: 'andresxdsad'
        };
    } else {
        return {
            statusBarText: '$(warning) Andrew sad ¿?',
            message: '¡Demasiados errores!',
            backgroundColor: new vscode.ThemeColor('statusBarItem.warningBackground'),
            imageName: 'andresad'
        };
    }
}

function showAndrewPanel(context: vscode.ExtensionContext): void {
    // Ahora se usa la sidebar en lugar de panel temporal
    vscode.commands.executeCommand('andrews-voiderrors.andrewView.focus');
}

// Webview View Provider para la sidebar
class AndrewWebviewViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'andrews-voiderrors.andrewView';
    
    private _view?: vscode.WebviewView;
    private _extensionUri: vscode.Uri;
    private _currentErrorCount: number = 0;

    constructor(extensionUri: vscode.Uri) {
        this._extensionUri = extensionUri;
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        this.updateContent(this._currentErrorCount);
        
        // Configurar el título de la vista
        webviewView.title = 'Andrew Monitor';
        webviewView.description = 'Estado del código';
    }

    public updateContent(errorCount: number) {
        this._currentErrorCount = errorCount;
        
        if (this._view) {
            const andrewState = getAndrewState(errorCount);
            this._view.webview.html = this._getHtmlForWebview(this._view.webview, andrewState, errorCount);
            
            // Actualizar el título con el conteo de errores
            this._view.title = `Andrew - ${errorCount} errores`;
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview, andrewState: AndrewState, errorCount: number): string {
        // Obtener la URI de la imagen
        const imagePath = vscode.Uri.joinPath(this._extensionUri, 'media', `${andrewState.imageName}.png`);
        const imageSrc = webview.asWebviewUri(imagePath);

        return `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Andrew Monitor</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        padding: 15px;
                        background: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                        text-align: center;
                        margin: 0;
                    }
                    .andrew-container {
                        width: 100%;
                    }
                    .andrew-image {
                        max-width: 100%;
                        max-height: 300px;
                        border-radius: 10px;
                        margin: 15px auto;
                        border: 2px solid var(--vscode-input-border);
                        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                    }
                    .andrew-message {
                        font-size: 14px;
                        margin: 15px 0;
                        padding: 10px;
                        border-radius: 6px;
                        background: var(--vscode-input-background);
                        border-left: 3px solid var(--vscode-input-border);
                    }
                    .error-count {
                        font-size: 20px;
                        font-weight: bold;
                        margin: 15px 0;
                        color: var(--vscode-errorForeground);
                    }
                    .title {
                        font-size: 16px;
                        margin-bottom: 8px;
                        color: var(--vscode-textLink-foreground);
                    }
                    .legend {
                        font-style: italic;
                        margin-top: 15px;
                        opacity: 0.7;
                        font-size: 12px;
                    }
                    .warning {
                        margin-top: 12px;
                        padding: 8px;
                        background: var(--vscode-inputValidation-warningBackground);
                        border: 1px solid var(--vscode-inputValidation-warningBorder);
                        border-radius: 4px;
                        font-size: 11px;
                    }
                    .status-info {
                        font-size: 12px;
                        opacity: 0.8;
                        margin-top: 10px;
                    }
                </style>
            </head>
            <body>
                <div class="andrew-container">
                    <div class="title">👁️ Andrew 👁️</div>
                    
                    <div class="error-count">${errorCount} errores</div>
                    
                    <img class="andrew-image" src="${imageSrc}" alt="Estado de Andrew">
                    
                    <div class="status-info">
                        Estado: ${andrewState.statusBarText.replace(/\$\([^)]+\)\s*/g, '')}
                    </div>
                    
                </div>
            </body>
            </html>
        `;
    }
}

export function deactivate() {
    // Limpiar recursos si es necesario
}