import { google } from 'googleapis';
import fs from 'fs-extra';
import path from 'path';

class GooglePlayPublisher {
  constructor(config = {}) {
    this.clientEmail = config.clientEmail || process.env.GOOGLE_PLAY_CLIENT_EMAIL;
    this.privateKey = config.privateKey || process.env.GOOGLE_PLAY_PRIVATE_KEY;
    this.packageName = config.packageName;
    this.androidPublisher = null;
  }

  async authenticate() {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: this.clientEmail,
        private_key: this.privateKey.replace(/\\n/g, '\n')
      },
      scopes: ['https://www.googleapis.com/auth/androidpublisher']
    });

    this.androidPublisher = google.androidpublisher({
      version: 'v3',
      auth
    });

    return this.androidPublisher;
  }

  async createEdit(packageName) {
    if (!this.androidPublisher) {
      await this.authenticate();
    }

    const edit = await this.androidPublisher.edits.insert({
      packageName
    });

    return edit.data.id;
  }

  async uploadBundle(editId, packageName, bundlePath, track = 'internal') {
    if (!fs.existsSync(bundlePath)) {
      throw new Error(`Bundle not found: ${bundlePath}`);
    }

    const bundle = fs.createReadStream(bundlePath);
    
    const upload = await this.androidPublisher.edits.bundles.upload({
      packageName,
      editId,
      media: {
        mimeType: 'application/octet-stream',
        body: bundle
      }
    });

    const versionCode = upload.data.versionCode;

    // Assign to track
    await this.androidPublisher.edits.tracks.update({
      packageName,
      editId,
      track,
      requestBody: {
        track,
        releases: [{
          name: `Release ${versionCode}`,
          versionCodes: [versionCode.toString()],
          status: 'draft'
        }]
      }
    });

    return { versionCode, bundleId: upload.data.sha1 };
  }

  async uploadApk(editId, packageName, apkPath, track = 'internal') {
    if (!fs.existsSync(apkPath)) {
      throw new Error(`APK not found: ${apkPath}`);
    }

    const apk = fs.createReadStream(apkPath);
    
    const upload = await this.androidPublisher.edits.apks.upload({
      packageName,
      editId,
      media: {
        mimeType: 'application/vnd.android.package-archive',
        body: apk
      }
    });

    const versionCode = upload.data.versionCode;

    await this.androidPublisher.edits.tracks.update({
      packageName,
      editId,
      track,
      requestBody: {
        track,
        releases: [{
          name: `Release ${versionCode}`,
          versionCodes: [versionCode.toString()],
          status: 'draft'
        }]
      }
    });

    return { versionCode };
  }

  async updateListing(editId, packageName, listing) {
    const { title, shortDescription, fullDescription, video } = listing;

    await this.androidPublisher.edits.listings.update({
      packageName,
      editId,
      language: 'en-US',
      requestBody: {
        title,
        shortDescription,
        fullDescription,
        video
      }
    });
  }

  async uploadScreenshots(editId, packageName, screenshots) {
    for (const screenshot of screenshots) {
      const { type, path: screenshotPath } = screenshot;
      const image = fs.createReadStream(screenshotPath);

      await this.androidPublisher.edits.images.upload({
        packageName,
        editId,
        language: 'en-US',
        imageType: type, // 'phoneScreenshots', 'sevenInchScreenshots', etc.
        media: {
          mimeType: 'image/png',
          body: image
        }
      });
    }
  }

  async commitEdit(editId, packageName) {
    await this.androidPublisher.edits.commit({
      packageName,
      editId
    });
  }

  async validateEdit(editId, packageName) {
    try {
      await this.androidPublisher.edits.validate({
        packageName,
        editId
      });
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  async publishToPlayStore(project, track = 'internal') {
    const packageName = project.packageName || `com.agent.${project.name.toLowerCase().replace(/\s+/g, '_')}`;
    
    try {
      const editId = await this.createEdit(packageName);
      
      let uploadResult;
      if (project.build?.aab) {
        uploadResult = await this.uploadBundle(editId, packageName, project.build.aab, track);
      } else if (project.build?.apk) {
        uploadResult = await this.uploadApk(editId, packageName, project.build.apk, track);
      } else {
        throw new Error('No build artifacts found');
      }

      await this.commitEdit(editId, packageName);

      return {
        success: true,
        editId,
        packageName,
        versionCode: uploadResult.versionCode,
        track
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getAppInfo(packageName) {
    if (!this.androidPublisher) {
      await this.authenticate();
    }

    try {
      const app = await this.androidPublisher.apps.get({ packageName });
      return app.data;
    } catch (error) {
      return null;
    }
  }

  async listTracks(packageName) {
    if (!this.androidPublisher) {
      await this.authenticate();
    }

    const tracks = await this.androidPublisher.edits.tracks.list({
      packageName,
      editId: await this.createEdit(packageName)
    });

    return tracks.data.tracks || [];
  }
}

export default GooglePlayPublisher;
