import {  getActivatedDateById, getAllPharmacy, getAllPharmacyApproved, getAllPharmacySelectData, getAllPharmacyYearlyData} from "../DAO/pharmacyDao.js";


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
export function getPharamacySelectData(req, res) {
    try {
        return getAllPharmacySelectData(req, res);
    } catch (err) {
        return new Error(err);
    }
}

export function getPharamacyActivatedDate(req, res) {
    console.log(req.query)
    try {
        return getActivatedDateById(req, res);
    } catch (err) {
        return new Error(err);
    }
}

