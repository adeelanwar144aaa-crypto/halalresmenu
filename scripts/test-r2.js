/**
 * Verify R2 S3 API credentials (bucket-scoped tokens; no ListBuckets).
 *
 * Usage: node scripts/test-r2.js
 */

require("dotenv").config({ path: ".env.local" });

const {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

const TEST_KEY = "test/hello.txt";

function trimEnv(name) {
  return process.env[name]?.trim() ?? "";
}

function makeClient(accountId, endpoint) {
  return new S3Client({
    region: "auto",
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: trimEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: trimEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
}

function formatErr(err) {
  return `${err?.name ?? "Error"}: ${err?.message ?? String(err)}`;
}

async function runPutHeadDelete(client, bucket) {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: TEST_KEY,
      Body: "ok",
      ContentType: "text/plain",
    })
  );
  await client.send(new HeadObjectCommand({ Bucket: bucket, Key: TEST_KEY }));
  await client.send(
    new DeleteObjectCommand({ Bucket: bucket, Key: TEST_KEY })
  );
}

async function tryEndpoint(label, endpoint, accountId, bucket) {
  const client = makeClient(accountId, endpoint);
  try {
    await runPutHeadDelete(client, bucket);
    return { ok: true, label, endpoint };
  } catch (err) {
    return { ok: false, label, endpoint, err };
  }
}

async function main() {
  const accountId = trimEnv("R2_ACCOUNT_ID");
  const accessKeyLen = trimEnv("R2_ACCESS_KEY_ID").length;
  const secretLen = trimEnv("R2_SECRET_ACCESS_KEY").length;
  const bucket = trimEnv("R2_BUCKET");

  const defaultEndpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const euEndpoint = `https://${accountId}.eu.r2.cloudflarestorage.com`;

  console.log("R2_ACCOUNT_ID length:", accountId.length, accountId.length === 32 ? "(ok)" : "(expected 32)");
  console.log("R2_ACCESS_KEY_ID length:", accessKeyLen, accessKeyLen === 32 ? "(ok)" : "(expected 32)");
  console.log(
    "R2_SECRET_ACCESS_KEY length:",
    secretLen,
    secretLen === 64 ? "(ok)" : "(expected 64)"
  );
  console.log("R2_BUCKET:", JSON.stringify(bucket));
  console.log("Default endpoint:", defaultEndpoint);
  console.log("EU fallback endpoint:", euEndpoint);
  console.log("");

  if (!accountId || !accessKeyLen || !secretLen || !bucket) {
    console.error("Missing required R2_* env in .env.local");
    process.exit(1);
  }

  let result = await tryEndpoint("default", defaultEndpoint, accountId, bucket);

  if (!result.ok) {
    console.log("PutObject failed on default endpoint:");
    console.log(" ", formatErr(result.err));
    console.log("Retrying with EU endpoint...");
    result = await tryEndpoint("EU", euEndpoint, accountId, bucket);
  }

  if (result.ok) {
    console.log("");
    console.log("SUCCESS: PutObject + HeadObject + DeleteObject on", result.label, "endpoint");
    console.log("Working endpoint:", result.endpoint);
    process.exit(0);
  }

  console.log("");
  console.log("FAILED on both endpoints.");
  console.log("Last error:", formatErr(result.err));
  process.exit(1);
}

main().catch((err) => {
  console.error(formatErr(err));
  process.exit(1);
});
