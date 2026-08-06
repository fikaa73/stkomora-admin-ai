/**
 * Sertifikati (Certificates) list – table from certificate + certificate_files.
 * Uses GET /certificates (certificate with user and files).
 */
import React, { useMemo, useState, useEffect } from 'react';
import {
  Table,
  Input,
  Button,
  Space,
  Modal,
  Typography,
  message,
  Drawer,
  Spin,
  Form,
  Tooltip,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { useMembers } from '../../hooks/useMembers';
import {
  useCertificates,
  useCertificate,
  useAddCertificate,
  useAddCertificateFile,
  useDeleteCertificate,
} from '../../hooks/useCertificates';
import CertificateForm from '../../components/forms/CertificateForm';
import BulkCertificatesModal from '../../components/forms/BulkCertificatesModal';

const { Search } = Input;
const { Text } = Typography;

export default function CertificateListPage() {
  const queryClient = useQueryClient();
  const { data: certificates = [], isLoading, error } = useCertificates();
  const { data: members = [] } = useMembers();
  const [searchText, setSearchText] = useState('');
  const [deleteModal, setDeleteModal] = useState({ visible: false, item: null });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('add');
  const [editingId, setEditingId] = useState(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: editingItem, isLoading: loadingItem, refetch } = useCertificate(editingId);
  const addCertificateMutation = useAddCertificate();
  const addFileMutation = useAddCertificateFile(editingId);
  const deleteCertificateMutation = useDeleteCertificate();

  const userOptions = useMemo(
    () =>
      (members || []).map((m) => ({
        value: m.id,
        label: `${m.name || ''} ${m.surname || ''}${m.email ? ` (${m.email})` : ''}`.trim() || `ID ${m.id}`,
      })),
    [members]
  );

  const userIdsWithCertificate = useMemo(
    () => new Set((certificates || []).map((c) => c.user_id).filter(Boolean)),
    [certificates]
  );

  useEffect(() => {
    if (!editingItem || drawerMode !== 'edit') return;
    form.setFieldsValue({
      user_id: editingItem.user_id,
    });
  }, [editingItem, drawerMode, form]);

  const filteredCertificates = useMemo(() => {
    if (!searchText.trim()) return certificates;
    const normalizedSearch = searchText.toLowerCase().trim();
    const searchParts = normalizedSearch.split(/\s+/).filter(Boolean);
    return certificates.filter((record) => {
      const u = record.user;
      const name = (u?.name || '').toLowerCase().trim();
      const surname = (u?.surname || '').toLowerCase().trim();
      const fullName = `${name} ${surname}`.trim();
      const reversedFullName = `${surname} ${name}`.trim();
      const phone = (u?.phone ? String(u.phone) : '').toLowerCase();
      const email = (u?.email || '').toLowerCase();

      if (phone.includes(normalizedSearch) || email.includes(normalizedSearch)) return true;

      if (searchParts.length === 1) {
        const term = searchParts[0];
        return name.includes(term) || surname.includes(term) || fullName.includes(term);
      }

      return (
        fullName.includes(normalizedSearch) ||
        reversedFullName.includes(normalizedSearch) ||
        searchParts.every((part) => fullName.includes(part))
      );
    });
  }, [certificates, searchText]);

  const openAddDrawer = () => {
    setDrawerMode('add');
    setEditingId(null);
    form.resetFields();
    setDrawerOpen(true);
  };

  const openEditDrawer = (record) => {
    setDrawerMode('edit');
    setEditingId(record.id);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingId(null);
    form.resetFields();
  };

  const handleAddFile = async (file, titleOrGetter) => {
    const title = typeof titleOrGetter === 'function' ? titleOrGetter() : titleOrGetter;
    await addFileMutation.mutateAsync({ file, title: title ?? '' });
    refetch();
  };

  const handleDeleteCertificate = async () => {
    if (!deleteModal.item?.id) return;
    try {
      await deleteCertificateMutation.mutateAsync(deleteModal.item.id);
      message.success('Sertifikati za ovog zaposlenog su obrisani');
      setDeleteModal({ visible: false, item: null });
    } catch (e) {
      message.error(e?.message || 'Greška pri brisanju');
    }
  };

  const onFormFinish = async (values) => {
    try {
      const userId = values.user_id;
      const fileList = values.certificates;
      const files = Array.isArray(fileList)
        ? fileList.map((f) => f.originFileObj || f).filter(Boolean)
        : [];
      const titles = Array.isArray(values.fileTitles) ? values.fileTitles : [];
      if (drawerMode === 'add') {
        if (!userId) {
          message.error('Izaberite člana');
          return;
        }
        const eventName = (values.event_name || '').trim();
        if (!eventName && files.length === 0) {
          message.error('Unesite naziv skupa ili dodajte sertifikat');
          return;
        }
        await addCertificateMutation.mutateAsync({
          user_id: userId,
          files,
          titles,
          event_name: eventName,
          points: values.points,
        });
        message.success('Skup je evidentiran');
        closeDrawer();
      } else {
        message.success('Podaci su ažurirani');
        closeDrawer();
      }
    } catch (e) {
      message.error(e?.message || 'Greška');
    }
  };

  const columns = [
    {
      title: 'Ime',
      key: 'name',
      width: 120,
      ellipsis: true,
      render: (_, record) => record.user?.name ?? '—',
    },
    {
      title: 'Prezime',
      key: 'surname',
      width: 120,
      ellipsis: true,
      render: (_, record) => record.user?.surname ?? '—',
    },
    {
      title: 'Telefon',
      key: 'phone',
      width: 120,
      ellipsis: true,
      render: (_, record) => record.user?.phone ?? '—',
    },
    {
      title: 'E-mail',
      key: 'email',
      width: 200,
      ellipsis: { showTitle: false },
      render: (_, record) => {
        const email = record.user?.email;
        return email ? (
          <Tooltip placement="topLeft" title={email}>
            <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {email}
            </span>
          </Tooltip>
        ) : (
          '—'
        );
      },
    },
    {
      title: 'Sertifikati',
      key: 'files',
      width: 100,
      render: (_, record) => record.files?.length ?? 0,
    },
    {
      title: 'Broj bodova',
      key: 'points',
      width: 110,
      render: (_, record) => {
        const total = (record.files || []).reduce((sum, f) => sum + (Number(f.points) || 0), 0);
        return Math.round(total * 100) / 100;
      },
    },
    {
      title: 'Akcije',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space wrap size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => openEditDrawer(record)}
            title="Izmijeni"
          />
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => setDeleteModal({ visible: true, item: record })}
            title="Obriši sve sertifikate"
          />
        </Space>
      ),
    },
  ];

  const formLoading = addCertificateMutation.isPending || addFileMutation.isPending;
  const drawerContent =
    drawerMode === 'edit' && loadingItem ? (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
        <Spin />
      </div>
    ) : (
      <CertificateForm
        form={form}
        onFinish={onFormFinish}
        loading={formLoading}
        submitLabel={drawerMode === 'add' ? 'Dodaj' : 'Sačuvaj'}
        onCancel={closeDrawer}
        editingCertificateId={drawerMode === 'edit' ? editingId : null}
        existingFiles={editingItem?.files}
        onFileAdded={handleAddFile}
        onFileRemoved={() => {
          queryClient.invalidateQueries({ queryKey: ['certificates'] });
          refetch();
        }}
        addFileLoading={addFileMutation.isPending}
        userOptions={userOptions}
      />
    );

  return (
    <div style={{ padding: '0 4px' }}>
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text strong style={{ fontSize: 18 }}>
            Sertifikati
          </Text>
          <Space wrap size="small">
            <Search
              placeholder="Pretraga..."
              allowClear
              onSearch={setSearchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 220, minWidth: 160 }}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={openAddDrawer}>
              Dodaj sertifikate
            </Button>
            <Button icon={<TeamOutlined />} onClick={() => setBulkModalOpen(true)}>
              Grupni unos
            </Button>
          </Space>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredCertificates}
          loading={isLoading}
          scroll={{ x: 700 }}
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            showTotal: (t) => `Ukupno: ${t}`,
            size: 'default',
          }}
          size="small"
          locale={{
            emptyText: error ? 'Greška pri učitavanju' : 'Nema unosa',
          }}
          className="certificate-table"
          style={{ minWidth: 600 }}
        />
      </div>
      <Modal
        title="Potvrda brisanja"
        open={deleteModal.visible}
        onOk={handleDeleteCertificate}
        onCancel={() => setDeleteModal({ visible: false, item: null })}
        okText="Obriši sve"
        cancelText="Odustani"
        confirmLoading={deleteCertificateMutation.isPending}
        okButtonProps={{ danger: true }}
      >
        Da li ste sigurni da želite obrisati sve sertifikate za člana:{' '}
        {deleteModal.item?.user?.name} {deleteModal.item?.user?.surname}?
      </Modal>
      <Drawer
        title={drawerMode === 'add' ? 'Dodaj sertifikate' : 'Izmijeni sertifikate'}
        placement="right"
        width={440}
        open={drawerOpen}
        onClose={closeDrawer}
        destroyOnClose
      >
        {drawerContent}
      </Drawer>
      <BulkCertificatesModal
        open={bulkModalOpen}
        onCancel={() => setBulkModalOpen(false)}
        members={members}
        userIdsWithCertificate={userIdsWithCertificate}
      />
    </div>
  );
}
