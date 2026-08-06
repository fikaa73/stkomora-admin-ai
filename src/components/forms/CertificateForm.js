/**
 * Certificate form – select user (member, role_id=1) + upload Sertifikati (certificate_files).
 * Each file has an optional title field.
 */
import React from 'react';
import { Form, Select, Upload, Button, message, Input, InputNumber } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import CertificateActions from '../CertificateActions';

export default function CertificateForm({
  form,
  onFinish,
  loading,
  submitLabel = 'Sačuvaj',
  cancelLabel = 'Odustani',
  onCancel,
  editingCertificateId,
  existingFiles = [],
  onFileAdded,
  onFileRemoved,
  addFileLoading,
  userOptions = [],
}) {
  const normMultipleFiles = (e) => {
    if (Array.isArray(e)) return e;
    return e?.fileList || [];
  };

  return (
    <Form form={form} layout="vertical" onFinish={onFinish} autoComplete="off">
      <Form.Item
        name="user_id"
        label="Član komore"
        rules={[{ required: true, message: 'Izaberite člana' }]}
      >
        <Select
          placeholder="Izaberite člana"
          showSearch
          optionFilterProp="label"
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={userOptions}
          disabled={!!editingCertificateId}
          allowClear={!editingCertificateId}
        />
      </Form.Item>

      {!editingCertificateId && (
        <>
          <Form.Item
            name="event_name"
            label="Naziv skupa"
            rules={[{ required: true, message: 'Unesite naziv skupa' }]}
          >
            <Input placeholder="npr. Simpozijum stomatologa 2026" />
          </Form.Item>

          <Form.Item name="points" label="Broj bodova skupa">
            <InputNumber
              min={0}
              step={0.5}
              style={{ width: '100%' }}
              placeholder="npr. 10"
            />
          </Form.Item>
        </>
      )}

      {editingCertificateId && existingFiles?.length > 0 && (
        <Form.Item label="Postojeći sertifikati">
          <div style={{ marginBottom: 16 }}>
            {existingFiles.map((fileRecord) => (
              <CertificateActions
                key={fileRecord.id}
                certificateId={editingCertificateId}
                fileRecord={fileRecord}
                showRemove
                onRemoved={onFileRemoved}
              />
            ))}
          </div>
        </Form.Item>
      )}

      {editingCertificateId && (
        <Form.Item name="newFileTitle" label="Naslov novog sertifikata">
          <Input placeholder="Naslov (opciono)" />
        </Form.Item>
      )}

      <Form.Item
        name="certificates"
        label={editingCertificateId ? 'Sertifikati' : 'Sertifikat (opciono)'}
        valuePropName="fileList"
        getValueFromEvent={normMultipleFiles}
        getValueProps={(v) => (Array.isArray(v) ? { fileList: v } : { fileList: [] })}
        extra={
          editingCertificateId
            ? 'Dodajte novi sertifikat (naslov iznad).'
            : 'Opciono — ako imate sertifikat, priložite ga. Skup se može evidentirati i bez fajla.'
        }
      >
        <Upload
          multiple
          maxCount={editingCertificateId ? 1 : 20}
          beforeUpload={(file) => {
            const isPdf = file.type === 'application/pdf';
            const isImage = ['image/jpeg', 'image/jpg', 'image/png'].includes(file.type);
            if (!isPdf && !isImage) {
              message.error('Samo PDF ili JPEG/PNG fajlovi su dozvoljeni.');
              return Upload.LIST_IGNORE;
            }
            if (editingCertificateId && onFileAdded) {
              const getTitle = () => form.getFieldValue('newFileTitle') ?? '';
              onFileAdded(file, getTitle).catch(() => {});
              return Upload.LIST_IGNORE;
            }
            return false;
          }}
          accept=".pdf,.jpg,.jpeg,.png"
        >
          <Button icon={<PlusOutlined />} loading={addFileLoading}>
            {editingCertificateId ? 'Dodaj sertifikat' : 'Izaberi sertifikate'}
          </Button>
        </Upload>
      </Form.Item>

      <Form.Item noStyle shouldUpdate={(prev, curr) => prev.certificates !== curr.certificates}>
        {({ getFieldValue }) => {
          const fileList = getFieldValue('certificates') || [];
          const count = Array.isArray(fileList) ? fileList.length : 0;
          if (count === 0 || editingCertificateId) return null;
          return (
            <>
              {Array.from({ length: count }, (_, i) => (
                <Form.Item
                  key={i}
                  name={['fileTitles', i]}
                  label={`Naslov (fajl ${i + 1})`}
                  style={{ marginBottom: 12 }}
                >
                  <Input placeholder="Naslov sertifikata" />
                </Form.Item>
              ))}
            </>
          );
        }}
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
