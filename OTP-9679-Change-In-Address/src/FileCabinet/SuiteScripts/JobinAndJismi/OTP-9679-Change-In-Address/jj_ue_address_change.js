/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

/************************************************************************************************ 
 *  
 * OTP-9679 : Address Change Detection
 * 
************************************************************************************************* 
 * 
 * Author: Jobin and Jismi IT Services 
 * 
 * Date Created : 11-November-2025 
 * 
 * Description : User Event Script to detect changes in customer address during edit and update a custom checkbox field
 * 
 * REVISION HISTORY
 *
 * @version 1.0 
 * 
*************************************************************************************************/

define(['N/log'], function (log) {

    /**
     * Executes before record is submitted. Checks for address changes and updates a checkbox field.
     * @param {Object} context - User event context
     */
    function beforeSubmit(context) {
        try {
            if (!isEditContext(context)) return;

            const newRecord = context.newRecord;
            const oldRecord = context.oldRecord;

            const addressChanged = hasAddressChanged(newRecord, oldRecord);
            updateCheckbox(newRecord, addressChanged);

        }
        catch (e) {
            log.error('Error in beforeSubmit', e.message);
        }
    }

    /**
     * Determines if the context type is EDIT.
     * @param {Object} context - User event context
     * @returns {boolean} True if context is EDIT
     */
    function isEditContext(context) {
        try {
            if (context.type !== context.UserEventType.EDIT) {
                log.debug('Skipped', 'Not an EDIT operation');
                return false;
            }
            return true;
        }
        catch (error) {
            log.error('isEditContext Error', error.message);
            return false;
        }
    }

    /**
     * Compares address sublist between new and old record to detect changes.
     * @param {Record} newRecord - New record object
     * @param {Record} oldRecord - Old record object
     * @returns {boolean} True if address has changed
     */
    function hasAddressChanged(newRecord, oldRecord) {
        try {
            const newCount = newRecord.getLineCount({ sublistId: 'addressbook' });
            const oldCount = oldRecord.getLineCount({ sublistId: 'addressbook' });

            log.debug('Line Count', `New: ${newCount}, Old: ${oldCount}`);

            if (newCount !== oldCount) {
                log.debug('Change Detected', 'Address line count changed');
                return true;
            }

            for (let i = 0; i < newCount; i++) {
                const newSub = newRecord.getSublistSubrecord({
                    sublistId: 'addressbook',
                    fieldId: 'addressbookaddress',
                    line: i
                });

                const oldSub = oldRecord.getSublistSubrecord({
                    sublistId: 'addressbook',
                    fieldId: 'addressbookaddress',
                    line: i
                });

                if (!newSub || !oldSub) {
                    log.debug('Change Detected', `Missing subrecord at line ${i}`);
                    return true;
                }

                if (isAddressLineChanged(newSub, oldSub, i)) {
                    return true;
                }
            }

            return false;
        }
        catch (error) {
            log.error('hasAddressChanged Error', error.message);
            return false;
        }
    }

    /**
     * Compares individual address fields between two subrecords.
     * @param {Record} newSub - New address subrecord
     * @param {Record} oldSub - Old address subrecord
     * @param {number} lineIndex - Line index for logging
     * @returns {boolean} True if any field has changed
     */
    function isAddressLineChanged(newSub, oldSub, lineIndex) {
        try {
            const fields = ['attention', 'addressee', 'addr1', 'addr2', 'city', 'state', 'zip', 'country'];

            for (let field of fields) {
                const newVal = newSub.getValue({ fieldId: field }) || '';
                const oldVal = oldSub.getValue({ fieldId: field }) || '';

                if (newVal !== oldVal) {
                    log.debug('Field Changed', `Line ${lineIndex}, Field: ${field}, Old: ${oldVal}, New: ${newVal}`);
                    return true;
                }
            }

            return false;
        }
        catch (error) {
            log.error('isAddressLineChanged Error', error.message);
            return false;
        }
    }

    /**
     * Updates the custom checkbox field based on address change detection.
     * @param {Record} record - Record object
     * @param {boolean} isChanged - True if address changed
     */
    function updateCheckbox(record, isChanged) {
        try {
            record.setValue({
                fieldId: 'custentity_jj_address_changed',
                value: isChanged
            });

            log.debug('Checkbox Updated', `custentity_jj_address_changed set to ${isChanged}`);
        }
        catch (error) {
            log.error('updateCheckbox Error', error.message);
        }
    }

    return {
        beforeSubmit: beforeSubmit
    };
});
