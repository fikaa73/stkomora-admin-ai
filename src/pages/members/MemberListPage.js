/**
 * Member list – table + side Drawer for add/edit.
 */
import React, { useMemo, useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Table, Input, Button, Space, Modal, Typography, message, Drawer, Spin, Form, Tooltip, Select, Descriptions, Avatar, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useMembers, useDeleteMember, useAddMember, useUpdateMember, useMember } from '../../hooks/useMembers';
import { useCompanies } from '../../hooks/useCompanies';
import { useLicenses } from '../../hooks/useLicenses';
import { useFinances } from '../../hooks/useFinances';
import { useCertificates } from '../../hooks/useCertificates';
import { certificatesApi } from '../../core/api/certificates';
import MemberForm from '../../components/forms/MemberForm';
import apiClient from '../../core/api/client';

const { Search } = Input;
const { Text } = Typography;

function getApiErrorMessage(error, fallback = 'Greška') {
  const payload = error?.response?.data?.message;
  if (typeof payload === 'string' && payload.trim()) return payload;

  if (payload && typeof payload === 'object') {
    const firstValue = Object.values(payload)[0];
    if (Array.isArray(firstValue) && firstValue[0]) return firstValue[0];
    if (typeof firstValue === 'string' && firstValue.trim()) return firstValue;
  }

  if (typeof error?.message === 'string' && error.message.trim()) return error.message;
  return fallback;
}

function formatMoney(v) {
  const n = Number(v);
  return Number.isNaN(n) ? '0.00' : n.toFixed(2);
}

const modernTableProps = {
  bordered: false,
  size: 'small',
  pagination: false,
  className: 'member-modern-table',
  rowClassName: (_, index) => (index % 2 === 0 ? 'row-even' : 'row-odd'),
};

function MemberDetailsPanel({ memberId }) {
  const { data: member, isLoading: loadingMember } = useMember(memberId);
  const { data: memberLicenses = [], isLoading: loadingLicenses } = useLicenses(memberId);
  const { data: finances = [], isLoading: loadingFinances } = useFinances();
  const { data: certificates = [], isLoading: loadingCertificates } = useCertificates();

  const memberFinances = useMemo(() => {
    return finances.filter((f) => {
      const userId = f.user_id ?? f.user?.id ?? f.member_id ?? f.member?.id;
      return userId === memberId;
    });
  }, [finances, memberId]);

  const lastFiveFinances = useMemo(() => {
    return [...memberFinances]
      .sort((a, b) => {
        const aTime = a.date ? new Date(a.date).getTime() : 0;
        const bTime = b.date ? new Date(b.date).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [memberFinances]);

  const memberSaldo = useMemo(() => {
    return memberFinances.reduce((acc, row) => acc + Number(row.duguje || 0) - Number(row.potrazuje || 0), 0);
  }, [memberFinances]);

  const memberCertificates = useMemo(() => {
    return certificates.filter((c) => {
      const userId = c.user_id ?? c.user?.id ?? c.member_id ?? c.member?.id;
      return userId === memberId;
    });
  }, [certificates, memberId]);

  const certificateRows = useMemo(() => {
    const rows = [];
    memberCertificates.forEach((certificate) => {
      const files = Array.isArray(certificate.files) ? certificate.files : [];
      files.forEach((file) => {
        rows.push({
          rowKey: `${certificate.id}-${file.id}`,
          certificateId: certificate.id,
          fileId: file.id,
          title: file.title || file.file_name || file.name || `Sertifikat #${file.id}`,
          createdAt: file.created_at ?? certificate.created_at,
        });
      });
    });
    return rows;
  }, [memberCertificates]);

  const financeColumns = [
    {
      title: 'Datum',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      render: (v) => (v ? dayjs(v).format('DD.MM.YYYY') : '–'),
    },
    {
      title: 'Opis',
      dataIndex: 'description',
      key: 'description',
      render: (v) => v || '–',
      ellipsis: true,
    },
    {
      title: 'Duguje',
      dataIndex: 'duguje',
      key: 'duguje',
      width: 110,
      align: 'right',
      render: (v) => formatMoney(v),
    },
    {
      title: 'Potražuje',
      dataIndex: 'potrazuje',
      key: 'potrazuje',
      width: 110,
      align: 'right',
      render: (v) => formatMoney(v),
    },
  ];

  const licenseColumns = [
    {
      title: 'Broj licence',
      dataIndex: 'license_number',
      key: 'license_number',
      width: 130,
      render: (v) => v || '–',
    },
    {
      title: 'Tip',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      render: (v) => {
        if (v === 'permanent') return 'stalna';
        if (v === 'temporary') return 'privremena';
        return v || '–';
      },
    },
    {
      title: 'Vrsta',
      dataIndex: 'kind',
      key: 'kind',
      width: 130,
      render: (v) => v || '–',
    },
    {
      title: 'Isticanje',
      dataIndex: 'expires_at',
      key: 'expires_at',
      width: 120,
      render: (v) => (v ? dayjs(v).format('DD.MM.YYYY') : '–'),
    },
  ];

  const certificateColumns = [
    {
      title: 'Naziv sertifikata',
      dataIndex: 'title',
      key: 'title',
      render: (v) => v || '–',
    },
    {
      title: 'Kreirano',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (v) => (v ? dayjs(v).format('DD.MM.YYYY') : '–'),
    },
  ];

  if (loadingMember) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
        <Spin />
      </div>
    );
  }

  if (!member) {
    return <Typography.Text type="secondary">Nema podataka o članu.</Typography.Text>;
  }

  const fullName = `${member.name || ''} ${member.surname || ''}`.trim() || 'Član';
  const statusColor = member.status === 'active' ? 'green' : 'default';
  const saldoColor = memberSaldo > 0 ? '#cf1322' : memberSaldo < 0 ? '#389e0d' : '#595959';

  const sectionStyle = {
    background: '#ffffff',
    border: '1px solid #f0f0f0',
    borderRadius: 12,
    padding: 16,
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
  };

  const sectionTitleStyle = {
    display: 'inline-block',
    fontSize: 16,
    fontWeight: 600,
    borderLeft: '4px solid #1677ff',
    paddingLeft: 10,
    lineHeight: 1.2,
    marginBottom: 10,
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <div
        style={{
          ...sectionStyle,
          background: 'linear-gradient(135deg, #f0f5ff 0%, #ffffff 65%)',
          borderColor: '#d6e4ff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
          <Avatar
            shape="square"
            size={88}
            src={member.image_url ?? member.image}
            style={{ borderRadius: 8 }}
          />
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>{fullName}</Typography.Title>
            <Typography.Text type="secondary">{member.email || 'Bez email adrese'}</Typography.Text>
            <div style={{ marginTop: 8 }}>
              <Tag color={member.is_active_member === false ? 'red' : 'green'}>
                {member.is_active_member === false ? 'Neaktivan član' : 'Aktivan član'}
              </Tag>
              <Tag color={statusColor}>{member.status || 'status nije definisan'}</Tag>
              <Tag color={member.is_exempt_now ? 'orange' : 'green'}>
                {member.is_exempt_now ? 'Oslobođen članarine' : 'Plaća članarinu'}
              </Tag>
              <Tag color="blue">{member.primaryCompany?.name ?? member.company ?? 'Bez ordinacije'}</Tag>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ background: '#fff', border: '1px solid #e6f4ff', borderRadius: 10, padding: '10px 14px', minWidth: 170 }}>
            <Typography.Text type="secondary">Ukupan saldo</Typography.Text>
            <div style={{ color: saldoColor, fontWeight: 700, fontSize: 18 }}>{formatMoney(memberSaldo)} €</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 10, padding: '10px 14px', minWidth: 170 }}>
            <Typography.Text type="secondary">Broj licenci</Typography.Text>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{memberLicenses.length}</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 10, padding: '10px 14px', minWidth: 170 }}>
            <Typography.Text type="secondary">Broj sertifikata</Typography.Text>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{certificateRows.length}</div>
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Podaci o članu</div>
        <Descriptions
          bordered
          column={2}
          size="small"
          style={{ marginTop: 4 }}
          className="member-modern-descriptions"
        >
          <Descriptions.Item label="Ime">{member.name ?? '–'}</Descriptions.Item>
          <Descriptions.Item label="Prezime">{member.surname ?? '–'}</Descriptions.Item>
          <Descriptions.Item label="E-mail">{member.email ?? '–'}</Descriptions.Item>
          <Descriptions.Item label="Telefon">{member.phone ?? '–'}</Descriptions.Item>
          <Descriptions.Item label="Pol">{member.sex ?? '–'}</Descriptions.Item>
          <Descriptions.Item label="Datum rođenja">{member.date_of_birth ? dayjs(member.date_of_birth).format('DD.MM.YYYY') : '–'}</Descriptions.Item>
          <Descriptions.Item label="Specijalnost">{member.speciality ?? '–'}</Descriptions.Item>
          <Descriptions.Item label="Fax">{member.fax_nbr ?? member.faximil ?? '–'}</Descriptions.Item>
          <Descriptions.Item label="Licenca">{member.licence ?? '–'}</Descriptions.Item>
          <Descriptions.Item label="Status">{member.status ?? '–'}</Descriptions.Item>
          <Descriptions.Item label="Grad">{member.city?.name ?? member.city ?? '–'}</Descriptions.Item>
          <Descriptions.Item label="Ordinacija">{member.primaryCompany?.name ?? member.company ?? '–'}</Descriptions.Item>
          <Descriptions.Item label="Status člana">
            {member.is_active_member === false
              ? `Neaktivan${member.inactive_date ? ' — ' + dayjs(member.inactive_date).format('DD.MM.YYYY') : ''}`
              : 'Aktivan'}
          </Descriptions.Item>
          {member.is_active_member === false && member.inactive_reason ? (
            <Descriptions.Item label="Obrazloženje" span={2}>{member.inactive_reason}</Descriptions.Item>
          ) : null}
        </Descriptions>
      </div>

      <div style={sectionStyle}>
        <div style={{ ...sectionTitleStyle, borderLeftColor: '#13c2c2' }}>Licence</div>
        <Table
          rowKey="id"
          columns={licenseColumns}
          dataSource={memberLicenses}
          loading={loadingLicenses}
          {...modernTableProps}
          style={{ marginTop: 12 }}
          locale={{ emptyText: 'Nema licenci' }}
        />
      </div>

      <div style={sectionStyle}>
        <div style={{ ...sectionTitleStyle, borderLeftColor: '#faad14' }}>Finansije (zadnjih 5)</div>
        <Table
          rowKey="id"
          columns={financeColumns}
          dataSource={lastFiveFinances}
          loading={loadingFinances}
          {...modernTableProps}
          style={{ marginTop: 12 }}
          locale={{ emptyText: 'Nema finansijskih stavki' }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <Typography.Text strong style={{ color: saldoColor }}>Saldo ukupno: {formatMoney(memberSaldo)} €</Typography.Text>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={{ ...sectionTitleStyle, borderLeftColor: '#722ed1' }}>Sertifikati</div>
        <div style={{ marginTop: 6 }}>
          <Typography.Text type="secondary">Broj sertifikata: {certificateRows.length}</Typography.Text>
        </div>
        <Table
          rowKey="rowKey"
          columns={certificateColumns}
          dataSource={certificateRows}
          loading={loadingCertificates}
          {...modernTableProps}
          style={{ marginTop: 12 }}
          locale={{ emptyText: 'Nema sertifikata' }}
          onRow={(record) => ({
            onClick: async () => {
              try {
                const blob = await certificatesApi.fetchFileBlob(record.certificateId, record.fileId, 'inline');
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank', 'noopener,noreferrer');
                setTimeout(() => URL.revokeObjectURL(url), 60000);
              } catch (err) {
                message.error(err?.message || 'Greška pri otvaranju sertifikata');
              }
            },
            style: { cursor: 'pointer' },
          })}
        />
      </div>
    </Space>
  );
}

export default function MemberListPage() {
  const { data: members = [], isLoading, error } = useMembers();
  const { data: companies = [] } = useCompanies();
  const { data: licenses = [] } = useLicenses();
  const deleteMember = useDeleteMember();
  const addMember = useAddMember();
  const updateMember = useUpdateMember();
  const [searchText, setSearchText] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [feeFilter, setFeeFilter] = useState('all'); // 'all' | 'liable' | 'exempt'
  const [statusFilter, setStatusFilter] = useState('active'); // 'all' | 'active' | 'inactive'
  const [deleteModal, setDeleteModal] = useState({ visible: false, member: null });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('add'); // 'add' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [detailsMemberId, setDetailsMemberId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const imageFileRef = useRef(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [form] = Form.useForm();

  const handleImageChange = (file) => {
    setImageFile(file);
    imageFileRef.current = file;
  };

  const { data: editingMember, isLoading: loadingMember } = useMember(editingId);

  useEffect(() => {
    if (!editingMember || drawerMode !== 'edit') return;
    // Convert sex string to integer for form (1 = muški, 2 = ženski)
    const sexValue = editingMember.sex === 'muški' ? 1 : editingMember.sex === 'ženski' ? 2 : undefined;
    form.setFieldsValue({
      name: editingMember.name,
      surname: editingMember.surname,
      sex: sexValue,
      dateOfBirth: (() => {
        const raw = editingMember.date_of_birth ?? editingMember.dateOfBirth;
        if (!raw) return null;
        const d = dayjs(raw);
        return d.isValid() ? d : null;
      })(),
      speciality: editingMember.speciality,
      company_id: editingMember.company_id ?? editingMember.primaryCompany?.id,
      city_id: editingMember.city?.id ?? editingMember.city_id,
      faximil: editingMember.fax_nbr ?? editingMember.faximil,
      email: editingMember.email,
      phone: editingMember.phone,
      is_active_member: editingMember.is_active_member ?? true,
      inactive_date: editingMember.inactive_date ? dayjs(editingMember.inactive_date) : null,
      inactive_reason: editingMember.inactive_reason,
    });
  }, [editingMember, drawerMode, form]);

  const companyOptions = useMemo(() => {
    if (!Array.isArray(companies)) return [];
    const sorted = [...companies].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return [
      { value: 'all', label: 'Sve ordinacije' },
      ...sorted.map((c) => ({ value: c.id, label: c.name || `Ordinacija #${c.id}` })),
    ];
  }, [companies]);

  const selectedCompanyName = useMemo(() => {
    if (companyFilter === 'all') return null;
    const c = companies.find((x) => x.id === companyFilter);
    return c?.name || null;
  }, [companies, companyFilter]);

  const companyFilterDisplayText = companyFilter === 'all' ? 'Sve ordinacije' : (selectedCompanyName || '');
  const companySelectMeasureRef = useRef(null);
  const [companySelectWidth, setCompanySelectWidth] = useState(220);

  useLayoutEffect(() => {
    if (!companySelectMeasureRef.current) return;
    const textWidth = companySelectMeasureRef.current.offsetWidth;
    setCompanySelectWidth(Math.max(220, textWidth + 40));
  }, [companyFilterDisplayText]);

  const filteredMembers = useMemo(() => {
    let result = members;
    if (companyFilter !== 'all') {
      result = result.filter(
        (m) => (m.company_id === companyFilter || m.primaryCompany?.id === companyFilter)
      );
    }
    if (statusFilter === 'active') {
      result = result.filter((m) => m.is_active_member !== false);
    } else if (statusFilter === 'inactive') {
      result = result.filter((m) => m.is_active_member === false);
    }
    if (feeFilter === 'liable') {
      result = result.filter((m) => !m.is_exempt_now);
    } else if (feeFilter === 'exempt') {
      result = result.filter((m) => !!m.is_exempt_now);
    }
    if (searchText.trim()) {
      const normalizedSearch = searchText.toLowerCase().trim();
      const searchParts = normalizedSearch.split(/\s+/).filter(Boolean);

      result = result.filter((m) => {
        const name = (m.name || '').toLowerCase().trim();
        const surname = (m.surname || '').toLowerCase().trim();
        const fullName = `${name} ${surname}`.trim();
        const reversedFullName = `${surname} ${name}`.trim();

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
    }
    return result;
  }, [members, searchText, companyFilter, feeFilter, statusFilter]);

  const licenseNumbersByUserId = useMemo(() => {
    const map = new Map();

    if (Array.isArray(licenses)) {
      licenses.forEach((license) => {
        const userId = license?.user_id ?? license?.user?.id ?? license?.member_id ?? license?.member?.id;
        const number = license?.license_number ?? license?.licence;
        if (!userId || !number) return;
        if (!map.has(userId)) map.set(userId, []);
        map.get(userId).push(number);
      });
    }

    if (Array.isArray(members)) {
      members.forEach((member) => {
        const userId = member?.id;
        if (!userId || !Array.isArray(member?.licenses)) return;
        member.licenses.forEach((license) => {
          const number = license?.license_number ?? license?.licence;
          if (!number) return;
          if (!map.has(userId)) map.set(userId, []);
          map.get(userId).push(number);
        });
      });
    }

    for (const [userId, values] of map.entries()) {
      map.set(userId, Array.from(new Set(values)));
    }

    return map;
  }, [licenses, members]);

  const openAddDrawer = () => {
    setDrawerMode('add');
    setEditingId(null);
    setImageFile(null);
    imageFileRef.current = null;
    setRemoveImage(false);
    form.resetFields();
    setDrawerOpen(true);
  };

  const openEditDrawer = (record) => {
    setDrawerMode('edit');
    setEditingId(record.id);
    setImageFile(null);
    imageFileRef.current = null;
    setRemoveImage(false);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingId(null);
    setImageFile(null);
    imageFileRef.current = null;
    setRemoveImage(false);
    form.resetFields();
  };

  const openDetailsDrawer = (record) => {
    if (!record?.id) return;
    setDetailsMemberId(record.id);
  };

  const handleDelete = async () => {
    if (!deleteModal.member?.id) return;
    try {
      await deleteMember.mutateAsync(deleteModal.member.id);
      message.success('Član je obrisan');
      setDeleteModal({ visible: false, member: null });
    } catch (e) {
      message.error(e?.message || 'Greška pri brisanju');
    }
  };

  const onFormFinish = async (values, imageFileFromForm) => {
    try {
      const dob = values.dateOfBirth ? dayjs(values.dateOfBirth).format('YYYY-MM-DD') : null;
      const sexValue = typeof values.sex === 'number' ? values.sex : (values.sex?.value || values.sex || 1);
      const fileToUpload = imageFileFromForm ?? imageFileRef.current ?? imageFile;

      const isActiveMember = values.is_active_member !== false;
      const inactiveDate =
        !isActiveMember && values.inactive_date
          ? dayjs(values.inactive_date).format('YYYY-MM-DD')
          : null;
      const inactiveReason = !isActiveMember ? (values.inactive_reason?.trim() || null) : null;

      if (fileToUpload || (drawerMode === 'edit' && removeImage)) {
        const formData = new FormData();
        formData.append('name', values.name);
        formData.append('surname', values.surname);
        formData.append('sex', sexValue);
        if (dob) formData.append('date_of_birth', dob);
        formData.append('speciality', values.speciality);
        formData.append('fax_nbr', values.faximil || '');
        formData.append('phone', values.phone);
        formData.append('email', values.email || '');
        formData.append('city_id', values.city_id);
        if (values.company_id != null) formData.append('company_id', values.company_id);
        if (fileToUpload) formData.append('image', fileToUpload);
        if (removeImage) formData.append('remove_image', '1');
        formData.append('is_active_member', isActiveMember ? '1' : '0');
        if (inactiveDate) formData.append('inactive_date', inactiveDate);
        if (inactiveReason) formData.append('inactive_reason', inactiveReason);

        if (drawerMode === 'add') {
          await addMember.mutateAsync(formData);
          message.success('Član je uspješno dodan');
        } else {
          await updateMember.mutateAsync({ id: editingId, data: formData });
          message.success('Podaci o članu su ažurirani');
        }
      } else {
        const payload = {
          name: values.name,
          surname: values.surname,
          sex: sexValue,
          date_of_birth: dob,
          speciality: values.speciality,
          fax_nbr: values.faximil || '',
          phone: values.phone,
          email: values.email || null,
          city_id: values.city_id,
          company_id: values.company_id || null,
          is_active_member: isActiveMember,
          inactive_date: inactiveDate,
          inactive_reason: inactiveReason,
        };
        if (drawerMode === 'add') {
          await addMember.mutateAsync(payload);
          message.success('Član je uspješno dodan');
        } else {
          await updateMember.mutateAsync({ id: editingId, ...payload });
          message.success('Podaci o članu su ažurirani');
        }
      }
      closeDrawer();
    } catch (e) {
      message.error(getApiErrorMessage(e, 'Greška'));
    }
  };

  const columns = [
    {
      title: 'Licenca',
      key: 'licence',
      width: 90,
      ellipsis: true,
      render: (_, record) => {
        const mapped = licenseNumbersByUserId.get(record?.id);
        if (Array.isArray(mapped) && mapped.length > 0) return mapped.join(', ');

        const relationLicenses = Array.isArray(record.licenses)
          ? record.licenses
              .map((l) => l?.license_number ?? l?.licence ?? l)
              .filter(Boolean)
          : [];

        if (relationLicenses.length > 0) return relationLicenses.join(', ');
        if (Array.isArray(record.licence)) {
          const legacyArray = record.licence
            .map((l) => l?.license_number ?? l?.licence ?? l)
            .filter(Boolean);
          return legacyArray.length > 0 ? legacyArray.join(', ') : '–';
        }

        return record.licence ?? record.license_number ?? '–';
      },
    },
    { title: 'Ime', dataIndex: 'name', key: 'name', width: 110, ellipsis: true },
    { title: 'Prezime', dataIndex: 'surname', key: 'surname', width: 110, ellipsis: true },
    { title: 'Telefon', dataIndex: 'phone', key: 'phone', width: 115 },
    {
      title: 'E-mail',
      dataIndex: 'email',
      key: 'email',
      width: 180,
      ellipsis: { showTitle: false },
      render: (email) =>
        email ? (
          <Tooltip placement="topLeft" title={email}>
            <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email}</span>
          </Tooltip>
        ) : (
          '–'
        ),
    },
    {
      title: 'Grad',
      key: 'city',
      width: 110,
      ellipsis: true,
      render: (_, record) => (record.city?.name ?? record.city ?? '–'),
    },
    {
      title: 'Radno mjesto',
      key: 'company',
      width: 130,
      ellipsis: true,
      render: (_, record) => record.primaryCompany?.name ?? record.company ?? '–',
    },
    {
      title: 'Status',
      key: 'is_active_member',
      width: 110,
      render: (_, record) =>
        record.is_active_member === false ? (
          <Tooltip
            title={
              [
                record.inactive_reason,
                record.inactive_date ? dayjs(record.inactive_date).format('DD.MM.YYYY') : null,
              ]
                .filter(Boolean)
                .join(' — ') || 'Neaktivan član'
            }
          >
            <Tag color="red">Neaktivan</Tag>
          </Tooltip>
        ) : (
          <Tag color="green">Aktivan</Tag>
        ),
    },
    {
      title: 'Članarina',
      key: 'is_exempt_now',
      width: 130,
      render: (_, record) =>
        record.is_exempt_now ? (
          <Tooltip title={record.exemption_until ? `Oslobođen do ${dayjs(record.exemption_until + '-01').format('MM.YYYY')}` : 'Oslobođen plaćanja'}>
            <Tag color="orange">Oslobođen</Tag>
          </Tooltip>
        ) : (
          <Tag color="green">Plaća</Tag>
        ),
    },
    {
      title: 'Akcije',
      key: 'actions',
      width: 130,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => openDetailsDrawer(record)}
            title="Detalji člana"
          />
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => openEditDrawer(record)}
            title="Izmijeni člana"
          />
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => setDeleteModal({ visible: true, member: record })}
            title="Obriši člana"
          />
        </Space>
      ),
    },
  ];

  const formLoading = addMember.isPending || updateMember.isPending;
  const editImageUrl = useMemo(() => {
    if (!editingMember) return null;
    const url = editingMember.image_url ?? editingMember.image;
    if (!url) return null;
    if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) return url;
    const base = (apiClient.defaults.baseURL || '').replace(/\/$/, '');
    const path = (url || '').replace(/^\//, '');
    return path ? `${base}/${path}` : null;
  }, [editingMember]);

  const drawerContent =
    drawerMode === 'edit' && loadingMember ? (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
        <Spin />
      </div>
    ) : (
      <MemberForm
        form={form}
        onFinish={onFormFinish}
        loading={formLoading}
        submitLabel={drawerMode === 'add' ? 'Dodaj' : 'Izmijeni'}
        onCancel={closeDrawer}
        editingMemberId={drawerMode === 'edit' ? editingId : null}
        imageUrl={drawerMode === 'edit' ? editImageUrl : null}
        imageFile={imageFile}
        onImageChange={handleImageChange}
        onRemoveImage={() => setRemoveImage(true)}
      />
    );

  return (
    <div style={{ padding: '0 4px' }}>
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <Text strong style={{ fontSize: 18 }}>
            Spisak članova komore
          </Text>
          {selectedCompanyName && (
            <div style={{ marginTop: 2 }}>
              <Text type="secondary" style={{ fontSize: 14 }}>
                Ordinacija: {selectedCompanyName}
              </Text>
            </div>
          )}
        </div>
        <Space wrap size="small">
          <span
            ref={companySelectMeasureRef}
            style={{
              position: 'absolute',
              visibility: 'hidden',
              whiteSpace: 'nowrap',
              fontSize: 14,
              fontFamily: 'inherit',
            }}
            aria-hidden
          >
            {companyFilterDisplayText}
          </span>
          <Select
            value={companyFilter}
            onChange={setCompanyFilter}
            style={{ width: companySelectWidth, minWidth: 220 }}
            options={companyOptions}
            showSearch
            optionFilterProp="label"
            placeholder="Ordinacija"
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 190, minWidth: 160 }}
            options={[
              { value: 'active', label: 'Aktivni članovi' },
              { value: 'inactive', label: 'Neaktivni članovi' },
              { value: 'all', label: 'Status: svi' },
            ]}
          />
          <Select
            value={feeFilter}
            onChange={setFeeFilter}
            style={{ width: 210, minWidth: 180 }}
            options={[
              { value: 'all', label: 'Članarina: svi' },
              { value: 'liable', label: 'Aktivni (plaćaju)' },
              { value: 'exempt', label: 'Neaktivni (oslobođeni)' },
            ]}
          />
          <Search
            placeholder="Pretraga..."
            allowClear
            onSearch={setSearchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 220, minWidth: 160 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddDrawer}>
            Dodaj člana
          </Button>
        </Space>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredMembers}
          loading={isLoading}
          scroll={{ x: 1100 }}
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            showTotal: (t) => `Ukupno: ${t}`,
            size: 'default',
          }}
          size="small"
          locale={{ emptyText: error ? 'Greška pri učitavanju' : 'Nema članova' }}
          onRow={(record) => ({
            onClick: (e) => {
              if (e.target.closest('button') || e.target.closest('a')) return;
              openDetailsDrawer(record);
            },
            style: { cursor: 'pointer' },
          })}
        />
      </div>
      <Modal
        title="Potvrda brisanja"
        open={deleteModal.visible}
        onOk={handleDelete}
        onCancel={() => setDeleteModal({ visible: false, member: null })}
        okText="Obriši"
        cancelText="Odustani"
        confirmLoading={deleteMember.isPending}
        okButtonProps={{ danger: true }}
      >
        Da li ste sigurni da želite obrisati člana: {deleteModal.member?.name}{' '}
        {deleteModal.member?.surname}?
      </Modal>
      <Drawer
        title={drawerMode === 'add' ? 'Dodaj člana komore' : 'Izmijeni člana komore'}
        placement="right"
        width={420}
        open={drawerOpen}
        onClose={closeDrawer}
        destroyOnClose
      >
        {drawerContent}
      </Drawer>
      <Drawer
        title="Detalji člana"
        placement="right"
        width={960}
        open={!!detailsMemberId}
        onClose={() => setDetailsMemberId(null)}
        styles={{
          header: { borderBottom: '1px solid #f0f0f0' },
          body: { background: '#f5f7fb', padding: 16 },
        }}
        destroyOnClose
      >
        <style>{`
          .member-modern-descriptions .ant-descriptions-view {
            border-radius: 10px;
            overflow: hidden;
            border: 1px solid #edf2f7;
          }
          .member-modern-descriptions .ant-descriptions-item-label {
            background: linear-gradient(180deg, #fafcff 0%, #f3f7ff 100%) !important;
            font-weight: 600;
            color: #1f2a44;
            border-color: #e6ebf5 !important;
          }
          .member-modern-descriptions .ant-descriptions-item-content {
            background: #ffffff;
            border-color: #edf2f7 !important;
          }
          .member-modern-descriptions .ant-descriptions-row:nth-child(even) .ant-descriptions-item-content {
            background: #fcfdff;
          }
          .member-modern-table .ant-table {
            border: 1px solid #edf2f7;
            border-radius: 10px;
            overflow: hidden;
            background: #fff;
          }
          .member-modern-table .ant-table-thead > tr > th {
            background: linear-gradient(180deg, #fafcff 0%, #f3f7ff 100%);
            font-weight: 600;
            color: #1f2a44;
            border-bottom: 1px solid #e6ebf5;
          }
          .member-modern-table .ant-table-tbody > tr.row-even > td {
            background: #ffffff;
          }
          .member-modern-table .ant-table-tbody > tr.row-odd > td {
            background: #fcfdff;
          }
          .member-modern-table .ant-table-tbody > tr:hover > td {
            background: #eef4ff !important;
          }
        `}</style>
        {detailsMemberId ? <MemberDetailsPanel memberId={detailsMemberId} /> : null}
      </Drawer>
    </div>
  );
}
