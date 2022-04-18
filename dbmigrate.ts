const command = Deno.args[0];
import { parse } from "https://deno.land/std@0.119.0/flags/mod.ts";

const flags = parse(Deno.args, {
  string: ["appId", "workspace", "table"],
});

// read flags passed in
const tableName = flags.table;
let appId = flags.appId;
let workspace = flags.workspace;
const dataFilePath = flags.filePath;

const decoder = new TextDecoder("utf-8");

// Reads and returns app.json
async function readAppsJson() {
  console.log("attempting to read .slack/apps.json");
  let data;
  try {
    data = await Deno.readFile(".slack/apps.json");
  } catch (e) {
    console.error(
      "could not find .slack/apps.json. Did you run the export command from your slack app directory?",
    );
    console.log(e);
    Deno.exit(1);
  }

  return JSON.parse(decoder.decode(data));
}

// Grabs the token from ~/.slack/credentials.json
async function readCredentialsJson(workspaceName: string) {
  console.log(
    "Reading `.slack/credentails.json from the home directory to get the token",
  );
  const credentialsData = await Deno.readFile(
    Deno.env.get("HOME") + "/.slack/credentials.json",
  );
  const credentialsJson = JSON.parse(decoder.decode(credentialsData));
  const token = credentialsJson[workspaceName].token;

  if (!token) {
    console.error("Failed getting the xoxp token");
    Deno.exit(1);
  }

  return token;
}

if (command === "export") {
  // Start of export command

  let jsonData;

  if (flags.table === undefined) {
    console.error(
      "You must provide the table name to export. use the --table flag to set the value.",
    );
    Deno.exit(1);
  }
  if (appId & workspace) {
    console.log("appId & workspace provided via flags");
  } else if (appId && workspace === undefined) {
    console.log(
      "appId provided via flag, attempting to grab workspace name from apps.json",
    );
    jsonData = await readAppsJson();
    workspace = jsonData["default"];
  } else if (workspace && appId === undefined) {
    console.log(
      "workspace name provided via flag, attempting to grab appId name from apps.json",
    );
    jsonData = await readAppsJson();
    appId = jsonData.apps[workspace].app_id;
  } else {
    jsonData = await readAppsJson();
    workspace = jsonData["default"];
    appId = jsonData.apps[workspace].app_id;
  }

  if (!appId && !workspace && !tableName) {
    console.log(
      "Script failed because it could not locate one of: appId, workspace name or table name. Please run this script in a slack project directory or pass in the values via flags (--appId, --table, --workspace)",
    );
  }

  const token = await readCredentialsJson(workspace);

  const response = await fetch(
    "https://slack.com/api/apps.hosted.tables.query",
    {
      method: "POST", // *GET, POST, PUT, DELETE, etc.
      headers: {
        "Content-Type": "application/json",
        "authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ "app_id": appId, "table": tableName }),
    },
  );
  const tableData = await response.json();
  if (tableData.ok) {
    await Deno.writeTextFile(
      `${tableName}DataBackup.json`,
      JSON.stringify(tableData),
    );
    console.log(
      `backed up data from ${tableName} into ${tableName}DataBackup.json`,
    );
  } else {
    console.error("fetching data from slack failed");
    console.error(tableData);
    Deno.exit(1);
  }
} else if (command === "import") {
  // Start of Import command
  let jsonData;
  
  if (dataFilePath === undefined) {
    console.error(
      "You must provide the path to the tables backup file you wish to import. use the --filePath flag to set the value.",
    );
    Deno.exit(1);
  }

  if (appId & workspace) {
    console.log("appId & workspace provided via flags");
  } else if (appId && workspace === undefined) {
    console.log(
      "appId provided via flag, attempting to grab workspace name from apps.json",
    );
    jsonData = await readAppsJson();
    workspace = jsonData["default"];
  } else if (workspace && appId === undefined) {
    console.log(
      "workspace name provided via flag, attempting to grab appId name from apps.json",
    );
    jsonData = await readAppsJson();
    appId = jsonData.apps[workspace].app_id;
  } else {
    jsonData = await readAppsJson();
    workspace = jsonData["default"];
    appId = jsonData.apps[workspace].app_id;
  }

  if (!appId && !workspace) {
    console.log(
      "Script failed because it could not locate one of: appId or workspace name. Please run this script in a slack project directory or pass in the values via flags (--appId, --workspace)",
    );
  }

  const token = await readCredentialsJson(workspace);

  console.log(`attempting to read ${dataFilePath}`);
  let data;
  try {
    data = await Deno.readFile(dataFilePath);
  } catch (e) {
    console.error(
      `could not read ${dataFilePath}`,
    );
    console.log(e);
    Deno.exit(1);
  }

  const tableData = JSON.parse(decoder.decode(data));
  console.log(tableData);

  const tableName = tableData.table;
  console.log(`Importing rows from ${tableName}`);

  for (const element in tableData.rows) {
    const response = await fetch(
      "https://slack.com/api/apps.datastore.put",
      {
        method: "POST", // *GET, POST, PUT, DELETE, etc.
        headers: {
          "Content-Type": "application/json",
          "authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          "app_id": appId,
          "datastore": tableName,
          item: tableData.rows[element],
        }),
      },
    );
    console.log(await response.json());
  }
}
