import {  getAllPharmacy, getAllPharmacyApproved, getAllPharmacyYearlyData} from "../DAO/pharmacyDao.js";


export function getPharmacy(req, res) {
    try {
        return getAllPharmacy(req, res);
    } catch (err) {
        return new Error(err);
    }
}

export function getPharmacyApproved(req, res) {
    try {
        return getAllPharmacyApproved(req, res);
    } catch (err) {
        return new Error(err);
    }
}

export function getPharmacyYearlyData(req, res) {
    try {
        return getAllPharmacyYearlyData(req, res);
    } catch (err) {
        return new Error(err);
    }
}

