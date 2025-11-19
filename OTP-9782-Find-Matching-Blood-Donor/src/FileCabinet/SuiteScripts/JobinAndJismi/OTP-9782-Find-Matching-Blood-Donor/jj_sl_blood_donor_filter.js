/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

/************************************************************************************************ 
 *  
 * OTP-9782 : Blood Donor Search Suitelet
 * 
************************************************************************************************* 
 * 
 * Author: Jobin and Jismi IT Services 
 * 
 * Date Created : 11-November-2025 
 * 
 * Description : Suitelet script to display a form for searching eligible blood bloodDonors based on 
 *               selected blood group and last donation date.
 * 
 * REVISION HISTORY
 *
 * @version 1.0
 * 
*************************************************************************************************/

define(['N/ui/serverWidget', 'N/search', 'N/log'], function (serverWidget, search, log) {

    const CUSTOM_RECORD_TYPE = 'customrecord_jj_blood_donor_details';
    const CLIENT_SCRIPT_PATH = './jj_cs_donorsearch.js';

    /**
     * Entry point for Suitelet execution.
     * @param {Object} context - Suitelet context object
     */
    function onRequest(context) {
        try {
            log.debug('Suitelet Triggered', 'Request method: ' + context.request.method);
            displayForm(context);
        } 
        catch (e) {
            log.error('Error in onRequest', e.message || e.toString());
        }
    }

    /**
     * Renders the donor search form and displays results based on selected blood group.
     * @param {Object} context - Suitelet context object
     */
    function displayForm(context) {
        try {
            const form = serverWidget.createForm({ title: 'Blood Donor Search' });
            form.clientScriptModulePath = CLIENT_SCRIPT_PATH;

            const bloodGroup = form.addField({
                id: 'custpage_blood_group',
                type: serverWidget.FieldType.SELECT,
                label: 'Blood Group'
            });
            bloodGroup.isMandatory = true;

            // Optional layout customization
            if (serverWidget.FieldLayoutType?.NORMAL) {
                bloodGroup.updateLayoutType({
                    layoutType: serverWidget.FieldLayoutType.NORMAL
                });
            }

            if (serverWidget.FieldBreakType?.START) {
                bloodGroup.updateBreakType({
                    breakType: serverWidget.FieldBreakType.START
                });
            }

            // Add blood group options
            bloodGroup.addSelectOption({ value: '', text: '' });
            bloodGroup.addSelectOption({ value: '1', text: 'A+' });
            bloodGroup.addSelectOption({ value: '2', text: 'A-' });
            bloodGroup.addSelectOption({ value: '3', text: 'B+' });
            bloodGroup.addSelectOption({ value: '4', text: 'B-' });
            bloodGroup.addSelectOption({ value: '5', text: 'AB+' });
            bloodGroup.addSelectOption({ value: '6', text: 'AB-' });
            bloodGroup.addSelectOption({ value: '7', text: 'O+' });
            bloodGroup.addSelectOption({ value: '8', text: 'O-' });

            const params = context.request.parameters;
            const selectedBloodGroup = params.custpage_blood_group;

            if (selectedBloodGroup) {
                bloodGroup.defaultValue = selectedBloodGroup;
            }

            const donorFilters = [['custrecord_jj_last_donation_date', 'onorbefore', 'threemonthsagotodate']];
            if (selectedBloodGroup) {
                donorFilters.push('AND', ['custrecord_jj_blood_group', 'is', selectedBloodGroup]);
            }

            const donorSearch = search.create({
                type: CUSTOM_RECORD_TYPE,
                filters: donorFilters,
                columns: [
                    'custrecord_jj_first_name',
                    'custrecord_jj_last_name',
                    'custrecord_jj_phone_numbers',
                    'custrecord_jj_gender',
                    'custrecord_jj_last_donation_date',
                    'custrecord_jj_blood_group'
                ]
            });

            const bloodDonors = [];
            donorSearch.run().each(result => {
                bloodDonors.push({
                    name: result.getValue('custrecord_jj_first_name') + ' ' + result.getValue('custrecord_jj_last_name'),
                    phone: result.getValue('custrecord_jj_phone_numbers'),
                    bloodGroup: result.getText('custrecord_jj_blood_group'),
                    lastDonation: result.getValue('custrecord_jj_last_donation_date')
                });
                return true;
            });

            form.addField({
                id: 'custpage_result_msg',
                type: serverWidget.FieldType.INLINEHTML,
                label: ' '
            }).defaultValue = `<b>Found ${bloodDonors.length} eligible donor(s)</b>`;

            if (bloodDonors.length > 0) {
                const sublistForm = form.addSublist({
                    id: 'custpage_donors',
                    type: serverWidget.SublistType.LIST,
                    label: 'Eligible Donors'
                });

                sublistForm.addField({ id: 'custpage_name', type: serverWidget.FieldType.TEXT, label: 'Name' });
                sublistForm.addField({ id: 'custpage_phone', type: serverWidget.FieldType.PHONE, label: 'Phone Number' });
                sublistForm.addField({ id: 'custpage_bloodgroup', type: serverWidget.FieldType.TEXT, label: 'Blood Group' });
                sublistForm.addField({ id: 'custpage_lastdonation', type: serverWidget.FieldType.DATE, label: 'Last Donation Date' });

                bloodDonors.forEach((donor, i) => {
                    sublistForm.setSublistValue({ id: 'custpage_name', line: i, value: donor.name });
                    sublistForm.setSublistValue({ id: 'custpage_phone', line: i, value: donor.phone });
                    sublistForm.setSublistValue({ id: 'custpage_bloodgroup', line: i, value: donor.bloodGroup });
                    sublistForm.setSublistValue({ id: 'custpage_lastdonation', line: i, value: donor.lastDonation });
                });
            } else {
                form.addField({
                    id: 'custpage_no_result',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: ' '
                }).defaultValue = '<p>No eligible bloodDonors found.</p>';
            }

            form.addSubmitButton({ label: 'Search' });
            context.response.writePage(form);

        } 
        catch (formError) {
            log.error('displayForm Error', formError.message || formError.toString());
        }
    }

    return {
        onRequest: onRequest
    };
});
