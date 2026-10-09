# Mini SK 23 — Projeto Android (Capacitor)

## Origem
Arquivo: Mini-SK-23.zip (43 arquivos)

## Estrutura
```
├── dist/           ← Arquivos do PWA (já embutidos)
├── android/        ← Projeto Android Studio
│   ├── app/
│   │   └── src/main/
│   ├── build.gradle
│   └── settings.gradle
├── capacitor.config.ts
└── README.md
```

## Como compilar o APK

### Requisitos
- Android Studio (https://developer.android.com/studio)
- Java 17+
- Android SDK 34

### Passo a passo
1. Extraia este ZIP
2. Abra o Android Studio → File → Open → pasta `android/`
3. Aguarde Gradle sync (~5 min na primeira vez)
4. **Build → Build Bundle(s)/APK(s) → Build APK(s)**
5. APK gerado: `android/app/build/outputs/apk/debug/app-debug.apk`

### Para instalar no celular
- Configurações → Segurança → Fontes desconhecidas ✓
- Transfira o .apk e abra para instalar

### Para assinar (Google Play)
- Build → Generate Signed Bundle/APK
- Crie um keystore e guarde em segurança

## Configuração
- **Package:** `com.meuapp.minisk23`
- **Versão:** 1.0.0 (code: 1)
- **Min SDK:** Android 22+
- **Orientação:** any
