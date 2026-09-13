"use strict";
// Shared types for AG-Cash application
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvanceStatus = exports.RequestStatus = exports.RequestType = void 0;
var RequestType;
(function (RequestType) {
    RequestType["EXPENSE"] = "EXPENSE";
    RequestType["ADVANCE"] = "ADVANCE";
})(RequestType || (exports.RequestType = RequestType = {}));
var RequestStatus;
(function (RequestStatus) {
    RequestStatus["DRAFT"] = "DRAFT";
    RequestStatus["SUBMITTED"] = "SUBMITTED";
    RequestStatus["APPROVED"] = "APPROVED";
    RequestStatus["REJECTED"] = "REJECTED";
    RequestStatus["PAID"] = "PAID";
    RequestStatus["CANCELLED"] = "CANCELLED";
})(RequestStatus || (exports.RequestStatus = RequestStatus = {}));
var AdvanceStatus;
(function (AdvanceStatus) {
    AdvanceStatus["PENDING"] = "PENDING";
    AdvanceStatus["APPROVED"] = "APPROVED";
    AdvanceStatus["DISBURSED"] = "DISBURSED";
    AdvanceStatus["SETTLED"] = "SETTLED";
    AdvanceStatus["CANCELLED"] = "CANCELLED";
})(AdvanceStatus || (exports.AdvanceStatus = AdvanceStatus = {}));
//# sourceMappingURL=index.js.map