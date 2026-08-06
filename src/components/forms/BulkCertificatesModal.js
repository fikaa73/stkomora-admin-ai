/**
 * Grupni unos istih sertifikata za više članova (checkbox izbor + zajednički upload).
 */
import React, { useMemo, useState, useEffect } from 'react';
import {
  Modal,
  Table,
  Input,
  Upload,
  Button,
  Form,
  message,
  Typography,
  Alert,
  Space,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { certificatesApi } from '../../core/api/certificates';

const { Search } = Input;
const { Text } = Typography;

function normMultipleFiles(e) {
  if (Array.isArray(e)) return e;
  return e?.fileList || [];
}

function memberLabel(m) {
  return `${m.name || ''} ${m.surname || ''}${m.email ? ` (${m.email})` : ''}`.trim() || `ID ${m.id}`;
}

export default function BulkCertificatesModal({
  open,
  onCancel,
  members = [],
  userIdsWithCertificate = new Set(),
}) {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [search, setSearch] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setSelectedRowKeys([]);
      form.resetFields();
    }
  }, [open, form]);

  const filteredMembers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return members;
    return members.filter((m) => memberLabel(m).toLowerCase().includes(q));
  }, [members, search]);

  const columns = useMemo(
    () => [
      {
        title: 'Ime',
        dataIndex: 'name',
        key: 'name',
        width: 110,
        ellipsis: true,
        render: (v) => v || '—',
      },
      {
        title: 'Prezime',
        dataIndex: 'surname',
        key: 'surname',
        width: 110,
        ellipsis: true,
        render: (v) => v || '—',
      },
      {
        title: 'E-mail',
        dataIndex: 'email',
        key: 'email',
        ellipsis: true,
        render: (v) => v || '—',
      },
      {
        title: 'Sertifikat',
        key: 'hasCert',
        width: 100,
        render: (_, record) =>
          userIdsWithCertificate.has(record.id) ? (
            <Text type="warning">Postoji</Text>
          ) : (
            <Text type="secondary">—</Text>
          ),
      },
    ],
    [userIdsWithCertificate]
  );

  const handleSubmit = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Izaberite bar jednog člana');
      return Promise.reject();
    }
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return Promise.reject();
    }
    const fileList = values.certificates;
    const files = Array.isArray(fileList)
      ? fileList.map((f) => f.originFileObj || f).filter(Boolean)
      : [];
    if (files.length === 0) {
      message.error('Dodajte bar jedan sertifikat');
      return Promise.reject();
    }
    const titles = Array.isArray(values.fileTitles) ? values.fileTitles : [];

    setSubmitting(true);
    const failed = [];
    let ok = 0;
    for (const userId of selectedRowKeys) {
      try {
        await certificatesApi.create({ user_id: userId, files, titles });
        ok += 1;
      } catch (e) {
        const m = members.find((x) => x.id === userId);
        failed.push({
          id: userId,
          label: m ? memberLabel(m) : String(userId),
          msg: e?.response?.data?.message || e?.message || 'Greška',
        });
      }
    }
    setSubmitting(false);
    queryClient.invalidateQueries({ queryKey: ['certificates'] });
    if (ok > 0) {
      message.success(`Dodato za ${ok} član(ova).`);
    }
    if (failed.length > 0) {
      setSelectedRowKeys(failed.map((f) => f.id));
      Modal.warning({
        title: 'Dio unosa nije uspio',
        width: 520,
        content: (
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, maxHeight: 240, overflow: 'auto' }}>
            {failed.map((f) => (
              <li key={f.id} style={{ marginBottom: 6 }}>
                <strong>{f.label}</strong>: {f.msg}
              </li>
            ))}
          </ul>
        ),
      });
    }
    if (ok === 0 && failed.length > 0) {
      message.error('Nijedan unos nije uspio.');
    }
    if (ok > 0 && failed.length === 0) {
      onCancel?.();
    }
  };

  return (
    <Modal
      title="Grupni unos sertifikata"
      open={open}
      onCancel={onCancel}
      width={720}
      destroyOnClose
      okText={`Dodaj za ${selectedRowKeys.length || '…'} član(ova)`}
      cancelText="Odustani"
      confirmLoading={submitting}
      onOk={handleSubmit}
      styles={{ body: { maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' } }}
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Isti fajlovi i naslovi bit će dodijeljeni svim označenim članovima. Za različite sertifikate po članu koristite „Dodaj sertifikate”."
      />
      <div style={{ marginBottom: 12 }}>
        <Text strong>Članovi</Text>
        <div style={{ marginTop: 8 }}>
          <Search
            placeholder="Pretraga po imenu, prezimenu, e-mailu…"
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          <Table
            size="small"
            rowKey="id"
            columns={columns}
            dataSource={filteredMembers}
            pagination={{ pageSize: 8, showSizeChanger: false, size: 'small' }}
            rowSelection={{
              type: 'checkbox',
              selectedRowKeys,
              onChange: setSelectedRowKeys,
              selections: [Table.SELECTION_ALL, Table.SELECTION_INVERT, Table.SELECTION_NONE],
            }}
            scroll={{ y: 220 }}
            locale={{ emptyText: 'Nema članova' }}
          />
        </div>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Označeno: {selectedRowKeys.length}
        </Text>
      </div>

      <Form form={form} layout="vertical" autoComplete="off">
        <Form.Item
          name="certificates"
          label="Sertifikati (zajednički za sve označene)"
          valuePropName="fileList"
          getValueFromEvent={normMultipleFiles}
          getValueProps={(v) => (Array.isArray(v) ? { fileList: v } : { fileList: [] })}
          extra="Možete izabrati više fajlova. Isti set ide svakom označenom članu."
        >
          <Upload
            multiple
            maxCount={20}
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
            <Button icon={<PlusOutlined />}>Izaberi sertifikate</Button>
          </Upload>
        </Form.Item>

        <Form.Item noStyle shouldUpdate={(prev, curr) => prev.certificates !== curr.certificates}>
          {({ getFieldValue }) => {
            const fileList = getFieldValue('certificates') || [];
            const count = Array.isArray(fileList) ? fileList.length : 0;
            if (count === 0) return null;
            return (
              <Space direction="vertical" style={{ width: '100%' }} size={12}>
                {Array.from({ length: count }, (_, i) => (
                  <Form.Item
                    key={i}
                    name={['fileTitles', i]}
                    label={`Naslov (fajl ${i + 1})`}
                    style={{ marginBottom: 0 }}
                  >
                    <Input placeholder="Naslov sertifikata" />
                  </Form.Item>
                ))}
              </Space>
            );
          }}
        </Form.Item>
      </Form>
    </Modal>
  );
}
