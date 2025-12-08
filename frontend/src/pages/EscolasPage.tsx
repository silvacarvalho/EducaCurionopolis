import React, { useState } from 'react';
import {
  Container,
  Tabs,
  Tab,
  Paper,
  Box,
} from '@mui/material';
import EscolasTab from '../components/escolas/EscolasTab';
import DiretoresTab from '../components/escolas/DiretoresTab';
import MainLayout from '../components/layout/MainLayout';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const EscolasPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <MainLayout title="Gestão de Escolas e Diretores">
      <Box sx={{ width: '100%', height: '100%' }}>
        <Paper>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab label="Escolas" id="tab-0" aria-controls="tabpanel-0" />
            <Tab label="Diretores" id="tab-1" aria-controls="tabpanel-1" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <EscolasTab />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <DiretoresTab />
          </TabPanel>
        </Paper>
      </Box>
    </MainLayout>
  );
};

export default EscolasPage;
