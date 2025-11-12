/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */

/************************************************************************************************ 
 *  
 * OTP-9782 : Blood Group Validation on Save
 * 
************************************************************************************************* 
 * 
 * Author: Jobin and Jismi IT Services 
 * 
 * Date Created : 11-November-2025 
 * 
 * Description : Client script to validate that a blood group is selected before form submission.
 * 
 * REVISION HISTORY
 *
 * @version 1.0
 * 
*************************************************************************************************/

define(['N/ui/dialog'], function (dialog) {

    /**
     * Executes when the page is initialized.
     * @param {Object} context - Page initialization context
     */
    function pageInit(context) {
        try {
            console.log('Client Script Loaded');
        } catch (error) {
            console.error('pageInit Error:', error.message);
        }
    }

    /**
     * Validates blood group selection before form submission.
     * @param {Object} context - Save record context
     * @returns {boolean} True if valid, false otherwise
     */
    function saveRecord(context) {
        try {
            const record = context.currentRecord;
            const bloodGroup = record.getValue({ fieldId: 'custpage_blood_group' });

            console.log('saveRecord triggered');
            console.log('Blood Group Value:', bloodGroup, 'Type:', typeof bloodGroup);

            if (bloodGroup === '' || bloodGroup === null || bloodGroup === undefined) {
                dialog.alert({
                    title: 'Missing Information',
                    message: 'Please select a Blood Group before searching.'
                });
                return false;
            }

            return true;

        } catch (error) {
            console.error('saveRecord Error:', error.message);
            return false;
        }
    }

    return {
        pageInit: pageInit,
        saveRecord: saveRecord
    };
});
