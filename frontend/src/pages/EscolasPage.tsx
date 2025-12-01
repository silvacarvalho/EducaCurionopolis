import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Tabs,
  Tab,
  Paper,
  IconButton,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import EscolasTab from '../components/escolas/EscolasTab';
import DiretoresTab from '../components/escolas/DiretoresTab';
import AppBarWithUserMenu from '../components/common/AppBarWithUserMenu';

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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box>
      <AppBarWithUserMenu title="Gestão de Escolas e Diretores" showBackButton />

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
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
      </Container>
    </Box>
  );
};

export default EscolasPage;
