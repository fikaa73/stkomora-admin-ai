/**
 * Početna stranica – homepage content editor.
 * Sidebar for field selection, main area for editing one field at a time.
 * Uses existing homePage API: GET /homePage, PUT /homePage/:id.
 */
import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Layout, Menu, Card, Typography, message, Spin } from 'antd';
import {
  AimOutlined,
  FormOutlined,
  InfoCircleOutlined,
  TagOutlined,
  TeamOutlined,
  FileTextOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { useHomePage, useUpdateHomePage } from '../hooks/useHomePage';

const { TextArea } = Input;
const { Sider, Content } = Layout;
const { Text } = Typography;

const SECTIONS = [
  { name: 'goal', label: 'Cilj komore', icon: <AimOutlined /> },
  { name: 'licence', label: 'Obrasci', icon: <FormOutlined /> },
  { name: 'about', label: 'O komori', icon: <InfoCircleOutlined /> },
  { name: 'titleh1', label: 'Naslov', icon: <TagOutlined /> },
  { name: 'titleMembers', label: 'Članovi komore', icon: <TeamOutlined /> },
  { name: 'titleMember', label: 'Vijesti', icon: <FileTextOutlined /> },
  { name: 'titleMemberH', label: 'Počasni članovi', icon: <StarOutlined /> },
];

const PLACEHOLDERS = {
  goal: 'Osnovni cilj Stomatološke komore je afirmacija stomatologije u svim segmentima, uz poštovanje etičkog kodeksa, kontinuiranu edukaciju i poboljšanje kvaliteta oralnog zdravlja crnogorske populacije.',
  licence: 'Licenca za rad je dokument koji doktoru stomatologije izdaje Stomatološka komora Crne Gore i uslov je za obavljanje samostalne djelatnosti. Licenca za rad se izdaje na period od sedam godina i može se obnoviti.',
  about: 'Osnivačka skupština je održana 16. decembra 2016. godine i to je datum koji predstavlja istorijski trenutak u crnogorskoj stomatologiji, a dana 25. aprila 2017. godine dobili smo i zvaničan status pravnog lica upisom u CRPS.',
  titleh1: 'Članstvo u Komori je obavezno za sve doktore stomatologije koji neposredno pružaju zdravstvenu zaštitu na teritoriji Crne Gore.',
  titleMembers: 'Članovi Komore su zdravstveni radnici koji su završili stomatološki fakultet i koji obavljaju zdravstvenu djelatnost iz oblasti stomatologije.',
  titleMember: 'Aktuelne informacije o novostima ili aktivnostima u oblasti stomatologije u Crnoj Gori, regionu i šire.',
  titleMemberH: 'Ovdje se možete informisati i preuzeti ažurirana akta Stomatološke komore Crne Gore.',
};

export default function HomePage() {
  const { data: content, isLoading, error } = useHomePage();
  const updateHomePage = useUpdateHomePage();
  const [form] = Form.useForm();
  const [selectedSection, setSelectedSection] = useState('goal');

  useEffect(() => {
    if (!content) return;
    form.setFieldsValue({
      id: content.id,
      goal: content.goal ?? '',
      licence: content.licence ?? '',
      about: content.about ?? '',
      titleh1: content.titleh1 ?? '',
      titleMembers: content.titleMembers ?? '',
      titleMember: content.titleMember ?? '',
      titleMemberH: content.titleMemberH ?? '',
    });
  }, [content, form]);

  const onFinish = async (values) => {
    const id = values.id ?? content?.id;
    if (!id) {
      message.error('Nema učitane stranice za ažuriranje.');
      return;
    }
    try {
      await updateHomePage.mutateAsync({
        id,
        goal: values.goal,
        licence: values.licence,
        about: values.about,
        titleh1: values.titleh1,
        titleMembers: values.titleMembers,
        titleMember: values.titleMember,
        titleMemberH: values.titleMemberH,
      });
      message.success('Uspješno ste promijenili podatke o početnoj stranici.');
    } catch (e) {
      message.error(e?.message || 'Greška pri čuvanju.');
    }
  };

  if (isLoading && !content) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="home-page-editor-v2">
      <div className="home-page-editor-v2-header" style={{ marginBottom: 20 }}>
        <Text strong style={{ fontSize: 18 }}>Početna stranica</Text>
      </div>
      <Layout
        className="home-page-editor-v2-layout"
        style={{
          background: 'transparent',
          minHeight: 420,
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <Sider
          width={240}
          className="home-page-editor-v2-sider"
          style={{
            background: '#fafafa',
            border: '1px solid #f0f0f0',
            borderRadius: 8,
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={[selectedSection]}
            onClick={({ key }) => setSelectedSection(key)}
            style={{
              border: 'none',
              background: 'transparent',
              padding: '8px 0',
            }}
            items={SECTIONS.map((s) => ({
              key: s.name,
              icon: s.icon,
              label: s.label,
            }))}
          />
        </Sider>
        <Content className="home-page-editor-v2-content" style={{ padding: '0 24px', minWidth: 0 }}>
          <Card
            bordered
            className="home-page-editor-v2-card"
            style={{
              borderRadius: 8,
              boxShadow: '0 1px 2px 0 rgba(0,0,0,0.03), 0 1px 6px -1px rgba(0,0,0,0.02), 0 2px 4px 0 rgba(0,0,0,0.02)',
            }}
            bodyStyle={{ padding: 24 }}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              initialValues={{
                goal: '',
                licence: '',
                about: '',
                titleh1: '',
                titleMembers: '',
                titleMember: '',
                titleMemberH: '',
              }}
            >
              <Form.Item name="id" hidden>
                <Input type="hidden" />
              </Form.Item>
              {SECTIONS.map((section) => (
                <div
                  key={section.name}
                  style={{
                    display: selectedSection === section.name ? 'block' : 'none',
                  }}
                >
                  <Form.Item
                    name={section.name}
                    label={
                      <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>
                        {section.label}
                      </span>
                    }
                    rules={[{ required: true, message: `Unesite sadržaj za ${section.label}` }]}
                  >
                    <TextArea
                      rows={10}
                      placeholder={PLACEHOLDERS[section.name]}
                      className="home-page-editor-v2-textarea"
                      style={{
                        resize: 'vertical',
                        fontSize: 14,
                        lineHeight: 1.6,
                      }}
                    />
                  </Form.Item>
                </div>
              ))}
              <Form.Item style={{ marginTop: 24, marginBottom: 0 }} className="home-page-editor-v2-actions">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={updateHomePage.isPending}
                  size="large"
                  className="home-page-editor-v2-save-btn"
                  style={{ minWidth: 140 }}
                >
                  Sačuvaj
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Content>
      </Layout>
    </div>
  );
}
