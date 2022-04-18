# Slack DBMigration

This script is used to export data from Slack Tables and to migrate it over to Slack Datastores. This script was created to help beta participants trying out Slack's next generation of the platform migrate their data.

## Exporting from Slack Tables

The export command writes data from a slack table into a json file. We recommend running this script from root of your slack app. This way, the script can easily grab your `appId` and `workspace` from the `apps.json` file.

Run the following command. Make sure to replace `$YOUR_TABLE_NAME` with the name of your table

```
deno run --allow-read --allow-write --allow-env --allow-net https://deno.land/x/slack_dbmigration/dbmigrate.ts export --table $YOUR_TABLE_NAME
```

You should now have a `$YOUR_TABLE_NAMEDataBackup.json` in the root of your slack app now. You can use the import command in this script to migrate this backup into Slack Datastore

### Available Options

```
--table (required)
--appId
--workspace - Workspace name
```

### Importing into Slack Datastores

We recommend running this script in the root of the new Slack app you have created to replace the early beta app you created. You need to add the Datastore schema to your `manifest.ts` file. The schema should mimic the table schema you used in your early beta Slack app.

Run the following command. Make sure to replace `$PATH_TO_YOUR_TABLE_NAME_DataBackup.json` with the relative or full path to the table data backup `.json` file.

```
deno run --allow-read --allow-env --allow-net https://deno.land/x/slack_dbmigration/dbmigrate.ts import --filePath=$PATH_TO_YOUR_TABLE_NAME_DataBackup.json
```

### Available Options

```
--filepath (required) - path to `.json` table backup file that was created when the `export` command was run
--appId
--workspace - Workspace name
```


## Reference

Old Slack Table Schema Example

```
// in tables/reversals.ts
export const Reversals = DefineTable("reversals", {
  primary_key: "id",
  columns: {
    id: {
      type: Schema.types.string,
    },
    original_string: {
      type: Schema.types.string,
    },
    reversed_string: {
      type: Schema.types.string,
    },
    channel_id: {
      type: Schema.slack.types.channel_id,
    },
  },
});

// In project.ts
tables: [Reversals],
```

New Slack Datastore Schema Example:

```
// in manifest.ts
const Reversals = DefineDatastore({
  primary_key: "id",
  name: "reversals",
  attributes: {
    id: {
      type: Schema.types.string,
    },
    original_string: {
      type: Schema.types.string,
    },
    reversed_string: {
      type: Schema.types.string,
    },
    channel_id: {
      type: Schema.slack.types.channel_id,
    },
  },
});

// Add this to the manifest export in manifest.ts
datastores: [Reversals],
```