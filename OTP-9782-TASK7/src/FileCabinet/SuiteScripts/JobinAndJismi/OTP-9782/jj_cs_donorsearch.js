/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/ui/dialog'], function (dialog) {

    function pageInit(context) {
        console.log('Client Script Loaded');
    }

    function saveRecord(context) {
        try {
            const record = context.currentRecord;
            const bloodGroup = record.getValue({ fieldId: 'custpage_blood_group' });

            console.log('saveRecord triggered');
            console.log('Blood Group:', bloodGroup);

            if (!bloodGroup) {
                dialog.alert({
                    title: 'Missing Information',
                    message: 'Please select a Blood Group before searching.'
                });
                return false;
            }

            return true;

        } catch (e) {
            console.error('Error in saveRecord', e.message);
            return false;
        }
    }

    return {
        pageInit: pageInit,
        saveRecord: saveRecord
    };
});
