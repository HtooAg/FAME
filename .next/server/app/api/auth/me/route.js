"use strict";
(() => {
var exports = {};
exports.id = 8788;
exports.ids = [8788];
exports.modules = {

/***/ 20399:
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-page.runtime.prod.js");

/***/ }),

/***/ 30517:
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-route.runtime.prod.js");

/***/ }),

/***/ 78893:
/***/ ((module) => {

module.exports = require("buffer");

/***/ }),

/***/ 84770:
/***/ ((module) => {

module.exports = require("crypto");

/***/ }),

/***/ 76162:
/***/ ((module) => {

module.exports = require("stream");

/***/ }),

/***/ 21764:
/***/ ((module) => {

module.exports = require("util");

/***/ }),

/***/ 11932:
/***/ ((module) => {

module.exports = import("@google-cloud/storage");;

/***/ }),

/***/ 22462:
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   originalPathname: () => (/* binding */ originalPathname),
/* harmony export */   patchFetch: () => (/* binding */ patchFetch),
/* harmony export */   requestAsyncStorage: () => (/* binding */ requestAsyncStorage),
/* harmony export */   routeModule: () => (/* binding */ routeModule),
/* harmony export */   serverHooks: () => (/* binding */ serverHooks),
/* harmony export */   staticGenerationAsyncStorage: () => (/* binding */ staticGenerationAsyncStorage)
/* harmony export */ });
/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(73278);
/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(45002);
/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(54877);
/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var C_Users_ASUS_OneDrive_Pictures_FAME_FAME_app_api_auth_me_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(74232);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([C_Users_ASUS_OneDrive_Pictures_FAME_FAME_app_api_auth_me_route_ts__WEBPACK_IMPORTED_MODULE_3__]);
C_Users_ASUS_OneDrive_Pictures_FAME_FAME_app_api_auth_me_route_ts__WEBPACK_IMPORTED_MODULE_3__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];




// We inject the nextConfigOutput here so that we can use them in the route
// module.
const nextConfigOutput = "standalone"
const routeModule = new next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({
    definition: {
        kind: next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__/* .RouteKind */ .x.APP_ROUTE,
        page: "/api/auth/me/route",
        pathname: "/api/auth/me",
        filename: "route",
        bundlePath: "app/api/auth/me/route"
    },
    resolvedPagePath: "C:\\Users\\ASUS\\OneDrive\\Pictures\\FAME\\FAME\\app\\api\\auth\\me\\route.ts",
    nextConfigOutput,
    userland: C_Users_ASUS_OneDrive_Pictures_FAME_FAME_app_api_auth_me_route_ts__WEBPACK_IMPORTED_MODULE_3__
});
// Pull out the exports that we need to expose from the module. This should
// be eliminated when we've moved the other routes to the new format. These
// are used to hook into the route.
const { requestAsyncStorage, staticGenerationAsyncStorage, serverHooks } = routeModule;
const originalPathname = "/api/auth/me/route";
function patchFetch() {
    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({
        serverHooks,
        staticGenerationAsyncStorage
    });
}


//# sourceMappingURL=app-route.js.map
__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 74232:
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   GET: () => (/* binding */ GET),
/* harmony export */   dynamic: () => (/* binding */ dynamic)
/* harmony export */ });
/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(71309);
/* harmony import */ var jsonwebtoken__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(67390);
/* harmony import */ var jsonwebtoken__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsonwebtoken__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _lib_gcs__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(45824);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_lib_gcs__WEBPACK_IMPORTED_MODULE_2__]);
_lib_gcs__WEBPACK_IMPORTED_MODULE_2__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];



const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-do-not-use-in-prod";
// Force dynamic rendering since this route uses request.cookies
const dynamic = "force-dynamic";
async function GET(request) {
    try {
        const token = request.cookies.get("auth-token")?.value;
        if (!token) return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({
            error: "No token"
        }, {
            status: 401
        });
        const decoded = jsonwebtoken__WEBPACK_IMPORTED_MODULE_1___default().verify(token, JWT_SECRET);
        // First check users index (for approved users)
        const users = await (0,_lib_gcs__WEBPACK_IMPORTED_MODULE_2__/* .readJsonFile */ .gn)(_lib_gcs__WEBPACK_IMPORTED_MODULE_2__/* .paths */ .Hb.usersIndex, []);
        let user = users.find((u)=>u.id === decoded.userId);
        console.log("User lookup result:", {
            userId: decoded.userId,
            found: !!user
        }); // Debug log
        // Special handling for super admin
        if (decoded.role === "super_admin") {
            const adminUser = users.find((u)=>u.role === "super_admin" && u.id === decoded.userId);
            if (adminUser) {
                return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({
                    id: adminUser.id,
                    email: adminUser.email,
                    name: adminUser.name,
                    role: "super_admin",
                    accountStatus: "active",
                    subscriptionStatus: "active"
                });
            }
        }
        // If not found in users index, check registrations (for pending users)
        if (!user) {
            const registrations = await (0,_lib_gcs__WEBPACK_IMPORTED_MODULE_2__/* .readJsonDirectory */ .Dw)(_lib_gcs__WEBPACK_IMPORTED_MODULE_2__/* .paths */ .Hb.registrationStageManagerDir);
            user = registrations.find((r)=>r.id === decoded.userId);
            console.log("Registration lookup result:", {
                userId: decoded.userId,
                found: !!user
            }); // Debug log
        }
        if (!user) return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({
            error: "User not found"
        }, {
            status: 404
        });
        // Check account status (super_admin bypasses most checks)
        if (user.role !== "super_admin") {
            if (user.accountStatus === "suspended") {
                return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({
                    error: "Account suspended",
                    accountStatus: "suspended"
                }, {
                    status: 403
                });
            }
            if (user.accountStatus === "deactivated") {
                return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({
                    error: "Account deactivated",
                    accountStatus: "deactivated"
                }, {
                    status: 403
                });
            }
            if (user.accountStatus === "rejected") {
                return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({
                    error: "Account rejected",
                    accountStatus: "rejected"
                }, {
                    status: 403
                });
            }
            // Allow pending users to get their data but they'll be redirected appropriately
            if (user.accountStatus === "pending") {
            // Return user data but the frontend will handle redirection
            }
        }
        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            eventId: user.eventId,
            accountStatus: user.accountStatus,
            subscriptionStatus: user.subscriptionStatus,
            subscriptionEndDate: user.subscriptionEndDate
        });
    } catch (error) {
        console.error("Me error:", error);
        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({
            error: "Invalid token"
        }, {
            status: 401
        });
    }
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 45824:
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   BX: () => (/* binding */ upsertArrayFile),
/* harmony export */   Dw: () => (/* binding */ readJsonDirectory),
/* harmony export */   Hb: () => (/* binding */ paths),
/* harmony export */   au: () => (/* binding */ writeJsonFile),
/* harmony export */   gn: () => (/* binding */ readJsonFile)
/* harmony export */ });
/* unused harmony exports GCSManager, gcsManager, deleteFromArrayFile, createArtistDataStructure */
/* harmony import */ var _google_cloud_storage__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(33425);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_google_cloud_storage__WEBPACK_IMPORTED_MODULE_0__]);
_google_cloud_storage__WEBPACK_IMPORTED_MODULE_0__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];
// Google Cloud Storage utility functions
// Note: This is a simplified implementation for demonstration
// In production, you would use the actual Google Cloud Storage SDK

// File paths configuration
const paths = {
    usersIndex: "users/index.json",
    registrationStageManagerDir: "registrations/stage-managers",
    registrationArtistDir: "registrations/artists",
    eventsIndex: "events/index.json",
    stageManagersIndex: "stage-managers/index.json",
    superAdminsIndex: "super-admins/index.json",
    globalArtistsIndex: "artists/index.json",
    stageManagerCounter: "counters/stage-manager.json",
    userByRole: (role, id)=>`users/${role}/${id}.json`,
    registrationStageManagerFile: (name, id)=>`registrations/stage-managers/${name}-${id}.json`,
    registrationArtistFile: (name, id)=>`registrations/artists/${name}-${id}.json`,
    eventFile: (eventId)=>`events/${eventId}.json`,
    artistFile: (artistId)=>`artists/${artistId}.json`,
    artistsIndex: (eventId)=>`events/${eventId}/artists/index.json`,
    stageManagerFile: (stageManagerId)=>`stage-managers/${stageManagerId}.json`,
    // Emergency paths used by API routes
    emergencyActive: (eventId)=>`events/${eventId}/emergency/active.json`,
    emergencyLogDir: (eventId)=>`events/${eventId}/emergency/logs`,
    emergencyLogFile: (eventId, id)=>`events/${eventId}/emergency/logs/${id}.json`
};
class GCSManager {
    constructor(bucketName = "artist-event-storage"){
        this.bucketName = bucketName;
    }
    /**
	 * Upload a file to Google Cloud Storage
	 */ async uploadFile(file, folder, artistId) {
        try {
            // Generate unique filename
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(2, 9);
            const extension = file.name.split(".").pop();
            const filename = `${timestamp}_${randomId}.${extension}`;
            // Convert File to Buffer
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            // Upload to Google Cloud Storage
            const result = await _google_cloud_storage__WEBPACK_IMPORTED_MODULE_0__["default"].uploadFile(buffer, filename, `${folder}/${artistId}`, file.type);
            return {
                url: result.url,
                filename: result.filename,
                size: file.size,
                contentType: file.type
            };
        } catch (error) {
            console.error("Error uploading file to Google Cloud Storage:", error);
            throw new Error("Failed to upload file to Google Cloud Storage");
        }
    }
    /**
	 * Upload multiple files
	 */ async uploadFiles(files, folder, artistId) {
        const uploadPromises = files.map((file)=>this.uploadFile(file, folder, artistId));
        return Promise.all(uploadPromises);
    }
    /**
	 * Delete a file from Google Cloud Storage
	 */ async deleteFile(filename) {
        try {
            await _google_cloud_storage__WEBPACK_IMPORTED_MODULE_0__["default"].deleteFile(filename);
        } catch (error) {
            console.error("Error deleting file from Google Cloud Storage:", error);
            throw new Error("Failed to delete file from Google Cloud Storage");
        }
    }
    /**
	 * Get a signed URL for file access
	 */ async getSignedUrl(filename, expiresIn = 3600) {
        try {
            return await _google_cloud_storage__WEBPACK_IMPORTED_MODULE_0__["default"].getSignedUrl(filename, expiresIn);
        } catch (error) {
            console.error("Error generating signed URL from Google Cloud Storage:", error);
            throw new Error("Failed to generate signed URL from Google Cloud Storage");
        }
    }
}
// Export a default instance
const gcsManager = new GCSManager();
async function readJsonFile(path, defaultValue = null) {
    try {
        const data = await _google_cloud_storage__WEBPACK_IMPORTED_MODULE_0__["default"].readJSON(path);
        return data !== null ? data : defaultValue;
    } catch (error) {
        console.error("Error reading JSON file from Google Cloud Storage:", error);
        return defaultValue;
    }
}
/**
 * Write JSON file to Google Cloud Storage
 */ async function writeJsonFile(path, data) {
    try {
        await _google_cloud_storage__WEBPACK_IMPORTED_MODULE_0__["default"].saveJSON(data, path);
    } catch (error) {
        console.error("Error writing JSON file to Google Cloud Storage:", error);
        throw new Error("Failed to write JSON file to Google Cloud Storage");
    }
}
/**
 * Read all JSON files from a directory in Google Cloud Storage
 */ async function readJsonDirectory(dirPath) {
    try {
        const files = await _google_cloud_storage__WEBPACK_IMPORTED_MODULE_0__["default"].listFiles(dirPath);
        const jsonFiles = files.filter((file)=>file.endsWith(".json"));
        const results = [];
        for (const file of jsonFiles){
            const data = await _google_cloud_storage__WEBPACK_IMPORTED_MODULE_0__["default"].readJSON(file);
            if (data !== null) {
                results.push(data);
            }
        }
        return results;
    } catch (error) {
        console.error("Error reading JSON directory from Google Cloud Storage:", error);
        return [];
    }
}
/**
 * Upsert (insert or update) an item in an array file
 */ async function upsertArrayFile(path, item, matchField = "id") {
    try {
        const existingData = await readJsonFile(path, []);
        const array = existingData || [];
        const existingIndex = array.findIndex((existing)=>existing[matchField] === item[matchField]);
        if (existingIndex >= 0) {
            // Update existing item
            array[existingIndex] = {
                ...array[existingIndex],
                ...item
            };
        } else {
            // Add new item
            array.push(item);
        }
        await writeJsonFile(path, array);
    } catch (error) {
        console.error("Error upserting array file:", error);
        throw new Error("Failed to upsert array file");
    }
}
/**
 * Delete an item from an array file
 */ async function deleteFromArrayFile(path, itemId, matchField = "id") {
    try {
        const existingData = await readJsonFile(path, []);
        const array = existingData || [];
        const filteredArray = array.filter((item)=>item[matchField] !== itemId);
        await writeJsonFile(path, filteredArray);
    } catch (error) {
        console.error("Error deleting from array file:", error);
        throw new Error("Failed to delete from array file");
    }
}
// Helper function to organize artist data in GCS-like structure
function createArtistDataStructure(artistData) {
    const artistId = artistData.id;
    const eventId = artistData.eventId;
    return {
        // Main artist data
        profile: {
            path: `artists/${artistId}/profile.json`,
            data: {
                id: artistData.id,
                artistName: artistData.artistName,
                realName: artistData.realName,
                email: artistData.email,
                phone: artistData.phone,
                style: artistData.style,
                performanceType: artistData.performanceType,
                performanceDuration: artistData.performanceDuration,
                biography: artistData.biography,
                createdAt: artistData.createdAt,
                status: artistData.status
            }
        },
        // Technical specifications
        technical: {
            path: `artists/${artistId}/technical.json`,
            data: {
                costumeColor: artistData.costumeColor,
                customCostumeColor: artistData.customCostumeColor,
                lightColorSingle: artistData.lightColorSingle,
                lightColorTwo: artistData.lightColorTwo,
                lightColorThree: artistData.lightColorThree,
                lightRequests: artistData.lightRequests,
                stagePositionStart: artistData.stagePositionStart,
                stagePositionEnd: artistData.stagePositionEnd,
                customStagePosition: artistData.customStagePosition
            }
        },
        // Social media and links
        social: {
            path: `artists/${artistId}/social.json`,
            data: {
                socialMedia: artistData.socialMedia,
                showLink: artistData.showLink
            }
        },
        // Notes and communications
        notes: {
            path: `artists/${artistId}/notes.json`,
            data: {
                mcNotes: artistData.mcNotes,
                stageManagerNotes: artistData.stageManagerNotes,
                specialRequirements: artistData.specialRequirements
            }
        },
        // Music tracks metadata
        music: {
            path: `artists/${artistId}/music.json`,
            data: {
                tracks: artistData.musicTracks?.map((track)=>({
                        song_title: track.song_title,
                        duration: track.duration,
                        notes: track.notes,
                        is_main_track: track.is_main_track,
                        tempo: track.tempo,
                        file_path: `artists/${artistId}/music/${track.song_title.replace(/[^a-zA-Z0-9]/g, "_")}.mp3`
                    })) || []
            }
        },
        // Gallery metadata
        gallery: {
            path: `artists/${artistId}/gallery.json`,
            data: {
                files: artistData.galleryFiles?.map((file, index)=>({
                        name: file.name,
                        type: file.type,
                        file_path: file.type === "video" ? `artists/${artistId}/videos/${file.name}` : `artists/${artistId}/images/${file.name}`
                    })) || []
            }
        },
        // Event association
        event: {
            path: `events/${eventId}/artists/${artistId}.json`,
            data: {
                artistId: artistData.id,
                artistName: artistData.artistName,
                eventId: artistData.eventId,
                eventName: artistData.eventName,
                status: artistData.status,
                registrationDate: artistData.createdAt
            }
        }
    };
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, [9379,4833,7390,3425], () => (__webpack_exec__(22462)));
module.exports = __webpack_exports__;

})();