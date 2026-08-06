/**
 * Employee form – used in Drawer (add/edit). Includes file uploads.
 */
import React from 'react';
import { Form, Input, DatePicker, Upload, Button, message, Divider } from 'antd';
import { UploadOutlined, PlusOutlined } from '@ant-design/icons';
import EmployeeFileActions from '../EmployeeFileActions';
import EmployeeContractActions from '../EmployeeContractActions';

export default function EmployeeForm({
  form,
  onFinish,
  loading,
  submitLabel = 'Sačuvaj',
  cancelLabel = 'Odustani',
  onCancel,
  editingEmployeeId,
  existingPersonalId,
  existingContracts = [],
  onContractAdded,
  onContractRemoved,
  onPersonalIdRemoved,
  addContractLoading,
}) {
  const normFile = (e) => {
    if (Array.isArray(e)) return e;
    return e?.fileList || [];
  };

  const normMultipleFiles = (e) => {
    if (Array.isArray(e)) return e;
    return e?.fileList || [];
  };

  return (
    <Form form={form} layout="vertical" onFinish={onFinish} autoComplete="off">
      <Form.Item name="jmbg" label="JMBG" rules={[{ required: true, len: 13, message: 'JMBG mora imati 13 cifara' }]}>
        <Input placeholder="13 cifara" maxLength={13} />
      </Form.Item>
      <Form.Item name="name" label="Ime" rules={[{ required: true }]}>
        <Input placeholder="Ime" />
      </Form.Item>
      <Form.Item name="surname" label="Prezime" rules={[{ required: true }]}>
        <Input placeholder="Prezime" />
      </Form.Item>
      <Form.Item name="email" label="E-mail" rules={[{ required: true }, { type: 'email' }]}>
        <Input placeholder="E-mail" type="email" />
      </Form.Item>
      <Form.Item name="phone" label="Telefon">
        <Input placeholder="Broj telefona" />
      </Form.Item>
      <Form.Item name="date_of_birth" label="Datum rođenja">
        <DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} placeholder="Datum rođenja" />
      </Form.Item>
      <Form.Item name="workplace" label="Radno mjesto">
        <Input placeholder="npr. Referent, Administrator, Higijeničar..." />
      </Form.Item>
      <Form.Item
        name="personal_id"
        label="Lična karta / pasoš (PDF ili slika)"
        valuePropName="fileList"
        getValueFromEvent={normFile}
        getValueProps={(v) => (Array.isArray(v) ? { fileList: v } : { fileList: [] })}
        extra={
          editingEmployeeId && existingPersonalId && (
            <EmployeeFileActions
              employeeId={editingEmployeeId}
              field="personal_id"
              filePath={existingPersonalId}
              showRemove
              onRemoved={onPersonalIdRemoved}
            />
          )
        }
      >
        <Upload
          maxCount={1}
          beforeUpload={(file) => {
            const isPdf = file.type === 'application/pdf';
            const isImage = ['image/jpeg', 'image/jpg', 'image/png'].includes(file.type);
            if (!isPdf && !isImage) {
              message.error('Samo PDF ili JPEG/PNG fajlovi su dozvoljeni.');
              return Upload.LIST_IGNORE;
            }
            return false;
          }}
          accept=".pdf,.jpg,.jpeg,.png"
        >
          <Button icon={<UploadOutlined />}>Izaberi fajl</Button>
        </Upload>
      </Form.Item>

      <Divider orientation="left">Ugovori</Divider>

      {editingEmployeeId && existingContracts?.length > 0 && (
        <Form.Item label="Postojeći ugovori">
          <div style={{ marginBottom: 12 }}>
            {existingContracts.map((contract) => (
              <EmployeeContractActions
                key={contract.id}
                employeeId={editingEmployeeId}
                contract={contract}
                showRemove
                onRemoved={onContractRemoved}
              />
            ))}
          </div>
        </Form.Item>
      )}

      <Form.Item
        name="contracts"
        label={editingEmployeeId ? 'Dodaj novi ugovor' : 'Ugovori (možete izabrati više)'}
        valuePropName="fileList"
        getValueFromEvent={normMultipleFiles}
        getValueProps={(v) => (Array.isArray(v) ? { fileList: v } : { fileList: [] })}
      >
        <Upload
          multiple
          maxCount={editingEmployeeId ? 1 : 10}
          beforeUpload={(file) => {
            const isPdf = file.type === 'application/pdf';
            const isImage = ['image/jpeg', 'image/jpg', 'image/png'].includes(file.type);
            if (!isPdf && !isImage) {
              message.error('Samo PDF ili JPEG/PNG fajlovi su dozvoljeni.');
              return Upload.LIST_IGNORE;
            }
            if (editingEmployeeId && onContractAdded) {
              onContractAdded(file).catch(() => {});
              return Upload.LIST_IGNORE;
            }
            return false;
          }}
          accept=".pdf,.jpg,.jpeg,.png"
        >
          <Button icon={<PlusOutlined />} loading={addContractLoading}>
            {editingEmployeeId ? 'Dodaj ugovor' : 'Izaberi ugovore'}
          </Button>
        </Upload>
      </Form.Item>

      <Form.Item style={{ marginBottom: 0 }}>
        <Button type="primary" htmlType="submit" loading={loading} style={{ marginRight: 8 }}>
          {submitLabel}
        </Button>
        {onCancel && <Button onClick={onCancel}>{cancelLabel}</Button>}
      </Form.Item>
    </Form>
  );
}
