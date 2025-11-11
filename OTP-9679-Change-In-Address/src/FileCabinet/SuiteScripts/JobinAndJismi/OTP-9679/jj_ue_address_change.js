/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/log'], function (log) {
 
    function beforeSubmit(context) {
        try {
            if (!isEditContext(context)) return;
 
            let newRecord = context.newRecord;
            let oldRecord = context.oldRecord;
 
            let addressChanged = hasAddressChanged(newRecord, oldRecord);
 
            updateCheckbox(newRecord, addressChanged);
 
        } catch (e) {
            log.error('Error in beforeSubmit', e.message);
        }
    }
 
    // Check if context is EDIT
    function isEditContext(context) {
        if (context.type !== context.UserEventType.EDIT) {
            log.debug('Skipped', 'Not an EDIT operation');
            return false;
        }
        return true;
    }
 
    // Compare address for changes
    function hasAddressChanged(newRecord, oldRecord) {
        let newCount = newRecord.getLineCount({ sublistId: 'addressbook' });
        let oldCount = oldRecord.getLineCount({ sublistId: 'addressbook' });
 
        log.debug('Line Count', 'New: ' + newCount + ', Old: ' + oldCount);
 
        if (newCount !== oldCount) {
            log.debug('Change Detected', 'Address line count changed');
            return true;
        }
 
        for (let i = 0; i < newCount; i++) {
            let newSub = newRecord.getSublistSubrecord({
                sublistId: 'addressbook',
                fieldId: 'addressbookaddress',
                line: i
            });
 
            let oldSub = oldRecord.getSublistSubrecord({
                sublistId: 'addressbook',
                fieldId: 'addressbookaddress',
                line: i
            });
 
            if (!newSub || !oldSub) {
                log.debug('Change Detected', 'Missing subrecord at line ' + i);
                return true;
            }
 
            if (isAddressLineChanged(newSub, oldSub, i)) {
                return true;
            }
        }
 
        return false;
    }
 
    // Compare individual address fields
    function isAddressLineChanged(newSub, oldSub, lineIndex) {
        let fields = ['attention', 'addressee', 'addr1', 'addr2', 'city', 'state', 'zip', 'country'];
 
        for (let j = 0; j < fields.length; j++) {
            let field = fields[j];
            let newVal = newSub.getValue({ fieldId: field }) || '';
            let oldVal = oldSub.getValue({ fieldId: field }) || '';
 
            if (newVal !== oldVal) {
                log.debug('Field Changed', 'Line ' + lineIndex + ', Field: ' + field + ', Old: ' + oldVal + ', New: ' + newVal);
                return true;
            }
        }
 
        return false;
    }
 
    // Update checkbox field based on result
    function updateCheckbox(record, isChanged) {
        record.setValue({
            fieldId: 'custentity_jj_address_changed',
            value: isChanged
        });
 
        log.debug('Checkbox Updated', 'custentity_jj_address_changed set to ' + isChanged);
    }
 
    return {
        beforeSubmit: beforeSubmit
    };
});