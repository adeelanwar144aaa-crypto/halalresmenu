require("dotenv").config({ path: ".env.local" });

const { S3Client, PutObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");

function requireEnv(name) {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing ${name} in .env.local`);
  return v;
}

/** R2_PUBLIC_URL must be the bucket public URL (pub-*.r2.dev or custom domain), not the S3 API endpoint. */
function assertPublicR2BaseUrl(publicUrl) {
  let hostname;
  try {
    hostname = new URL(
      publicUrl.includes("://") ? publicUrl : `https://${publicUrl}`
    ).hostname.toLowerCase();
  } catch {
    throw new Error(
      `R2_PUBLIC_URL is not a valid URL: ${publicUrl}. Use your R2 public bucket URL (e.g. https://pub-xxxxx.r2.dev).`
    );
  }
  if (hostname.includes("r2.cloudflarestorage.com")) {
    throw new Error(
      `R2_PUBLIC_URL must not be the S3 API endpoint (${hostname}). In Cloudflare R2 → your bucket → Settings → Public access, enable the r2.dev subdomain and set R2_PUBLIC_URL to that https://pub-….r2.dev URL.`
    );
  }
}

function getR2Config() {
  const accountId = requireEnv("R2_ACCOUNT_ID");
  const bucket = requireEnv("R2_BUCKET");
  const publicUrl = requireEnv("R2_PUBLIC_URL").replace(/\/$/, "");
  assertPublicR2BaseUrl(publicUrl);

  return {
    accountId,
    bucket,
    publicUrl,
    client: new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
        secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
      },
    }),
  };
}

function publicUrlForKey(publicBase, key) {
  return `${publicBase}/${key.replace(/^\//, "")}`;
}

async function headObject(client, bucket, key) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (err) {
    if (err?.name === "NotFound" || err?.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw err;
  }
}

async function putObject(client, bucket, key, body, contentType, cacheControl) {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
    })
  );
}

module.exports = {
  assertPublicR2BaseUrl,
  getR2Config,
  publicUrlForKey,
  headObject,
  putObject,
};
