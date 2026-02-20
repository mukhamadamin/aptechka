const fs = require("fs");
const path = require("path");
const { createRunOncePlugin, withDangerousMod } = require("expo/config-plugins");

const PLUGIN_NAME = "with-expo-widgets-pinning";
const PLUGIN_VERSION = "1.0.0";

const PIN_FUNCTION_BLOCK = `    Function("requestPinWidget") { packageName: String, providerClassName: String ->
      val widgetManager = AppWidgetManager.getInstance(context)
      if (!widgetManager.isRequestPinAppWidgetSupported) {
        return@Function false
      }

      val normalizedProviderName = when {
        providerClassName.startsWith(".") -> packageName + providerClassName
        providerClassName.contains(".") -> providerClassName
        else -> "$packageName.$providerClassName"
      }

      return@Function try {
        val provider = ComponentName(packageName, normalizedProviderName)
        widgetManager.requestPinAppWidget(provider, null, null)
      } catch (_: Throwable) {
        false
      }
    }
`;

function walkFiles(dir) {
  const output = [];
  if (!fs.existsSync(dir)) return output;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      output.push(...walkFiles(fullPath));
      continue;
    }
    output.push(fullPath);
  }

  return output;
}

function patchExpoWidgetsModule(projectRoot) {
  const javaRoot = path.join(projectRoot, "android", "app", "src", "main", "java");
  const candidates = walkFiles(javaRoot).filter((file) => file.endsWith("Module.kt"));

  for (const file of candidates) {
    const source = fs.readFileSync(file, "utf8");
    if (!source.includes('Name("ExpoWidgets")')) continue;
    if (source.includes('Function("requestPinWidget")')) return;

    const marker = "    }\n  }\n";
    if (!source.includes(marker)) {
      throw new Error(`[${PLUGIN_NAME}] Unable to find insertion point in ${file}`);
    }

    const updated = source.replace(marker, `${PIN_FUNCTION_BLOCK}${marker}`);
    fs.writeFileSync(file, updated, "utf8");
    return;
  }

  throw new Error(`[${PLUGIN_NAME}] ExpoWidgets Module.kt not found in android sources.`);
}

const withExpoWidgetsPinning = (config) =>
  withDangerousMod(config, [
    "android",
    async (modConfig) => {
      patchExpoWidgetsModule(modConfig.modRequest.projectRoot);
      return modConfig;
    },
  ]);

module.exports = createRunOncePlugin(withExpoWidgetsPinning, PLUGIN_NAME, PLUGIN_VERSION);
