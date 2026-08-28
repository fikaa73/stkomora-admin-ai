/**
 * Member form fields – used inside Drawer (add/edit).
 * Image upload: shown only in form sidebar; not in list.
 */
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Form, Input, Select, Button, Space, DatePicker, Upload, Avatar, Switch, Divider } from 'antd';
import { PlusOutlined, UserOutlined, CameraOutlined } from '@ant-design/icons';
import { useCities } from '../../hooks/useMembers';
import { useCompanies } from '../../hooks/useCompanies';
import CompanyCreateModal from './CompanyCreateModal';

const SEX_OPTIONS = [
  { value: 1, label: 'muški' },
  { value: 2, label: 'ženski' },
];

function CompanySelectWithAdd({ value, onChange, onAddClick, ...selectProps }) {
  return (
    <Space.Compact style={{ width: '100%' }}>
      <Select
        value={value}
        onChange={onChange}
        style={{ flex: 1 }}
        {...selectProps}
      />
      <Button
        type="default"
        icon={<PlusOutlined />}
        onClick={onAddClick}
        title="Dodaj novu ordinaciju"
      />
    </Space.Compact>
  );
}

const CITY_OPTIONS = [
  { value: 1, label: 'Andrijevica' }, { value: 2, label: 'Bar' }, { value: 3, label: 'Berane' },
  { value: 4, label: 'Bijelo Polje' }, { value: 5, label: 'Budva' }, { value: 6, label: 'Cetinje' },
  { value: 7, label: 'Danilovgrad' }, { value: 8, label: 'Gusinje' }, { value: 9, label: 'Herceg Novi' },
  { value: 10, label: 'Kolašin' }, { value: 11, label: 'Kotor' }, { value: 12, label: 'Mojkovac' },
  { value: 13, label: 'Nikšić' }, { value: 14, label: 'Petnjica' }, { value: 15, label: 'Plav' },
  { value: 16, label: 'Plužine' }, { value: 17, label: 'Pljevlja' }, { value: 18, label: 'Podgorica' },
  { value: 19, label: 'Rožaje' }, { value: 20, label: 'Šavnik' }, { value: 21, label: 'Tivat' },
  { value: 22, label: 'Tuzi' }, { value: 23, label: 'Ulcinj' }, { value: 24, label: 'Zeta' }, { value: 25, label: 'Žabljak' },
];

export default function MemberForm({
  form,
  onFinish,
  loading,
  submitLabel = 'Sačuvaj',
  cancelLabel = 'Odustani',
  onCancel,
  editingMemberId,
  imageUrl = null,
  imageFile = null,
  onImageChange,
  onRemoveImage,
}) {
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [localPreview, setLocalPreview] = useState(null);
  const selectedFileRef = useRef(null);
  const { data: cities = [] } = useCities();
  const { data: companies = [] } = useCompanies();

  useEffect(() => {
    if (!imageFile) {
      setLocalPreview(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setLocalPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const cityOptions = useMemo(() => {
    if (Array.isArray(cities) && cities[0]?.id != null) {
      return cities.map((c) => ({ value: c.id, label: c.name || c.label }));
    }
    return CITY_OPTIONS;
  }, [cities]);

  const companyOptions = useMemo(() => {
    if (!Array.isArray(companies)) return [];
    return companies.map((c) => ({ value: c.id, label: c.name || `Ordinacija #${c.id}` }));
  }, [companies]);

  const handleCompanyCreated = (company) => {
    form.setFieldValue('company_id', company.id);
  };

  const handleUploadChange = (info) => {
    const raw = info.file?.originFileObj ?? info.file;
    const file = raw && typeof raw === 'object' && raw instanceof File ? raw : null;
    selectedFileRef.current = file;
    onImageChange?.(file || null);
  };

  const handleFormFinish = (values) => {
    const fileToSend = selectedFileRef.current ?? imageFile;
    onFinish(values, fileToSend);
  };

  return (
    <Form form={form} layout="vertical" onFinish={handleFormFinish} autoComplete="off">
      <Form.Item label="Fotografija" style={{ marginBottom: 16 }}>
        <Space direction="vertical" align="center" style={{ width: '100%' }}>
          <Avatar
            size={80}
            src={localPreview || imageUrl}
            icon={<UserOutlined />}
            shape="square"
            style={{ borderRadius: 8 }}
          />
          <Upload
            accept="image/jpeg,image/png,image/jpg,image/gif"
            showUploadList={false}
            beforeUpload={() => false}
            onChange={handleUploadChange}
          >
            <Button icon={<CameraOutlined />} size="small">
              Izaberi sliku
            </Button>
          </Upload>
          {(imageUrl || imageFile) && (onImageChange || onRemoveImage) && (
            <Button
              type="link"
              danger
              size="small"
              onClick={() => {
                selectedFileRef.current = null;
                onImageChange?.(null);
                onRemoveImage?.();
              }}
            >
              Ukloni sliku
            </Button>
          )}
        </Space>
      </Form.Item>
      <Form.Item name="name" label="Ime" rules={[{ required: true }]}>
        <Input placeholder="Unesite ime" />
      </Form.Item>
      <Form.Item name="surname" label="Prezime" rules={[{ required: true }]}>
        <Input placeholder="Unesite prezime" />
      </Form.Item>
      <Form.Item name="sex" label="Rod" rules={[{ required: true }]}>
        <Select options={SEX_OPTIONS} placeholder="Izaberite rod" />
      </Form.Item>
      <Form.Item name="dateOfBirth" label="Datum rođenja" rules={[{ required: true }]}>
        <DatePicker format="DD.MM.YYYY" placeholder="Izaberite datum" style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="speciality" label="Specijalnost" rules={[{ required: true }]}>
        <Input placeholder="Specijalnost" />
      </Form.Item>
      <Form.Item name="company_id" label="Ordinacija (ustanova)">
        <CompanySelectWithAdd
          options={companyOptions}
          onAddClick={() => setCompanyModalOpen(true)}
          placeholder="Izaberite ordinaciju"
          showSearch
          optionFilterProp="label"
          allowClear
        />
      </Form.Item>
      <Form.Item name="city_id" label="Grad" rules={[{ required: true }]}>
        <Select options={cityOptions} placeholder="Izaberite grad" showSearch optionFilterProp="label" />
      </Form.Item>
      <Form.Item name="faximil" label="Br. faksimila">
        <Input placeholder="Broj faksimila" allowClear />
      </Form.Item>
      <Form.Item name="email" label="E-mail" rules={[{ required: true }, { type: 'email' }]}>
        <Input placeholder="E-mail" />
      </Form.Item>
      <Form.Item name="phone" label="Telefon" rules={[{ required: true }, { min: 9, message: 'Min. 9 cifara' }]}>
        <Input placeholder="Broj telefona" />
      </Form.Item>
      <Form.Item name="napomena" label="Napomena">
        <Input.TextArea rows={3} placeholder="Interna napomena o stomatologu" maxLength={5000} allowClear />
      </Form.Item>

      <Divider orientation="left" style={{ marginTop: 8 }}>Status člana</Divider>
      <Form.Item
        name="is_active_member"
        label="Aktivan član"
        valuePropName="checked"
        initialValue={true}
        extra="Neaktivni članovi se ne prikazuju na sajtu, ali ostaju u evidenciji."
      >
        <Switch checkedChildren="Aktivan" unCheckedChildren="Neaktivan" />
      </Form.Item>
      <Form.Item noStyle shouldUpdate={(prev, curr) => prev.is_active_member !== curr.is_active_member}>
        {({ getFieldValue }) =>
          getFieldValue('is_active_member') === false ? (
            <>
              <Form.Item name="inactive_date" label="Datum (npr. preminuo dana)">
                <DatePicker format="DD.MM.YYYY" placeholder="Izaberite datum" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="inactive_reason" label="Obrazloženje">
                <Input.TextArea rows={2} placeholder="npr. Preminuo" maxLength={512} />
              </Form.Item>
            </>
          ) : null
        }
      </Form.Item>

      <Form.Item style={{ marginBottom: 0 }}>
        <Button type="primary" htmlType="submit" loading={loading} style={{ marginRight: 8 }}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button onClick={onCancel}>{cancelLabel}</Button>
        )}
      </Form.Item>
      <CompanyCreateModal
        open={companyModalOpen}
        onClose={() => setCompanyModalOpen(false)}
        onCreated={handleCompanyCreated}
        memberId={editingMemberId}
      />
    </Form>
  );
}
