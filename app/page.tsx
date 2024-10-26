"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { ModeToggle } from "@/components/mode-toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CoinGeckoClient } from "@/lib/coingecko";
import { NetworkGraphs } from "@/components/network-graphs";
import { Github } from "lucide-react";
import Link from "next/link";

interface NetworkStats {
  scores: Array<{
    id: string;
    score: number;
    adminScore: number;
    epoch: number;
    updated: string;
    checked: string;
    identity: string;
    isComputor: boolean;
  }>;
  minScore: number;
  maxScore: number;
  averageScore: number;
  createdAt: string;
  scoreStatistics: Array<{
    epoch: number;
    daydate: string;
    maxScore: number;
    realMinScore: number;
    minScore: number;
    avgScore: number;
  }>;
  estimatedIts: number;
  solutionsPerHour: number;
  solutionsPerHourCalculated: number;
  difficulty: number;
}

interface EpochInfo {
  epochNumber: number;
  curEpochBegin: Date;
  curEpochEnd: Date;
  curEpochProgress: number;
}

interface Income {
  qubicPrice: number;
  incomePerOneITS: number;
  dailyIncome: number;
  dailyIncomeBySols: number;
  dailyIncomeBySolsCal: number;
  curSolPrice: number;
  curSolPriceCal: number;
  dailySolutions: number;
  luckiness: number;
}

interface Translations {
  [key: string]: {
    [key: string]: string;
  };
}

const translations: Translations = {
  en: {
    title: "Qubic Income Calculator",
    hashrate: "Your Hashrate (it/s)",
    solsCount: "Your Solutions Count",
    calculate: "Calculate",
    epochInfo: "Current Epoch Information",
    currentEpoch: "Current Epoch",
    epochStart: "Epoch Start (UTC+8)",
    epochEnd: "Epoch End (UTC+8)",
    epochProgress: "Epoch Progress",
    networkInfo: "Network Information",
    estimatedHashrate: "Estimated Network Hashrate",
    averageScore: "Average Score",
    solutionsPerHour: "Solutions per Hour",
    incomeEstimate: "Income Estimate (85% Pool)",
    qubicPrice: "Qubic Price",
    dailyIncome: "Estimated Daily Income (Hashrate)",
    dailyIncomeBySols: "Estimated Solutions Income",
    solIncome: "Estimated Income per Solution",
    dailySolutions: "Estimated Daily Solutions",
    luckiness: "Luckiness (Actual/Expected)",
    loading: "Loading...",
    error: "An error occurred. Please try again.",
    pressCalculate: "Press Calculate to see income estimates",
    calculator: "Calculator",
    graph: "Graph",
    donate: "Donate",
    donateInfo: "If you'd like to donate, here are my addresses:",
    qubicAddress: "Qubic Address",
    erc20Address: "ERC-20 Address",
  },
  zh: {
    title: "Qubic 收益计算器",
    hashrate: "您的算力 (it/s)",
    solsCount: "您的解决方案数量",
    calculate: "计算",
    epochInfo: "目前纪元信息",
    currentEpoch: "目前纪元",
    epochStart: "纪元开始 (UTC+8)",
    epochEnd: "纪元结束 (UTC+8)",
    epochProgress: "纪元进度",
    networkInfo: "网络信息",
    estimatedHashrate: "估计网络算力",
    averageScore: "平均分数",
    solutionsPerHour: "每小时解决方案数",
    incomeEstimate: "收益估算 (85% 收益池)",
    qubicPrice: "Qubic 价格",
    dailyIncome: "预计每日收入 (算力)",
    dailyIncomeBySols: "预计 Sol 收入",
    solIncome: "每个解决方案的预计收入",
    dailySolutions: "预计每日解决方案数",
    luckiness: "幸运度 (实际/预期)",
    loading: "加载中...",
    error: "发生错误。请重试。",
    pressCalculate: "点击计算查看收益估算",
    calculator: "计算器",
    graph: "图表",
    donate: "捐赠",
    donateInfo: "如果您想捐赠，这里是我的地址：",
    qubicAddress: "Qubic 地址",
    erc20Address: "ERC-20 地址",
  },
};

export default function QubicCalculator() {
  const [hashrate, setHashrate] = useState<string>("");
  const [solsCount, setSolsCount] = useState<string>("");
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [epochInfo, setEpochInfo] = useState<EpochInfo | null>(null);
  const [income, setIncome] = useState<Income | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [language, setLanguage] = useState<"en" | "zh">("en");
  const [qubicPrice, setQubicPrice] = useState<number>(0);
  const [method, setMethod] = useState<"method1" | "method2">("method1");

  const t = translations[language];

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const loginResponse = await fetch("/api/qubic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: "guest@qubic.li",
          password: "guest13@Qubic.li",
          twoFactorCode: "",
        }),
      });
      const loginData = await loginResponse.json();
      const token = loginData.token;

      const scoreResponse = await fetch(`/api/qubic?token=${token}`);
      const scoreData: NetworkStats = await scoreResponse.json();

      setNetworkStats(scoreData);
      calculateEpochInfo(scoreData);

      const cgClient = new CoinGeckoClient();
      const price = await cgClient.getPrice("qubic-network", "usd");
      setQubicPrice(price);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(t.error);
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const calculateEpochInfo = (data: NetworkStats) => {
    const epochNumber = data.scoreStatistics[0].epoch;
    const epoch97Begin = new Date("2024-02-21T12:00:00Z");
    const curEpochBegin = new Date(
      epoch97Begin.getTime() + (epochNumber - 97) * 7 * 24 * 60 * 60 * 1000,
    );
    const curEpochEnd = new Date(
      curEpochBegin.getTime() + 7 * 24 * 60 * 60 * 1000 - 1000,
    );
    const curEpochProgress =
      (Date.now() - curEpochBegin.getTime()) / (7 * 24 * 60 * 60 * 1000);

    setEpochInfo({
      epochNumber,
      curEpochBegin,
      curEpochEnd,
      curEpochProgress,
    });
  };

  const calculateIncome = () => {
    if (!networkStats || !epochInfo || !hashrate || qubicPrice === 0) return;

    const poolReward = 0.85;
    const netHashrate = networkStats.estimatedIts;
    const netAvgScores = networkStats.averageScore;
    const netTotalScoreArray = networkStats.scores;

    // Calculate total scores
    const netSolsPerHourCalc = networkStats.solutionsPerHourCalculated;

    // Method 1: Calculate by network average score
    const curSolPrice =
      (1 / netAvgScores / 1.1) * 1035500000 * 0.92 * qubicPrice;

    // Method 2: Calculate by total score / 676
    const totalScore = netTotalScoreArray.reduce((total, obj) => total + obj.score, 0);
    const netTotalScore = totalScore / 676;

    const curSolPriceCal =
      (1 / netTotalScore / 1.1) * 1035500000 * 0.92 * qubicPrice;

    const incomePerOneITS =
      poolReward * qubicPrice * (782000000000 / netHashrate / 7 / 1.06);
    const dailyIncome = Number(hashrate) * incomePerOneITS;

    let dailyIncomeBySols = 0;
    if (solsCount) {
      dailyIncomeBySols = Number(solsCount) * curSolPrice;
    }

    let dailyIncomeBySolsCal = 0;
    if (solsCount) {
      dailyIncomeBySolsCal = Number(solsCount) * curSolPriceCal;
    }

    const dailySolutionsCalc =
      (24 * Number(hashrate) * netSolsPerHourCalc) / netHashrate;
    const expectedSols = dailySolutionsCalc * (epochInfo.curEpochProgress * 7);
    const actualSols = Number(solsCount);

    const luckiness = actualSols / expectedSols;

    setIncome({
      qubicPrice,
      incomePerOneITS,
      dailyIncome,
      dailyIncomeBySols,
      dailyIncomeBySolsCal,
      curSolPrice,
      curSolPriceCal,
      dailySolutions: dailySolutionsCalc,
      luckiness,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="grid grid-cols-3 gap-2">
          {[...Array(9)].map((_, i) => (
            <motion.div
              key={i}
              className="w-4 h-4 bg-primary rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [1, 0.5, 1],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.1,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-grid-small-light dark:bg-grid-small-dark opacity-10" />
      </div>
      <div className="container mx-auto px-4 py-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-between items-center mb-8"
        >
          <h1 className="text-3xl font-bold">{t.title}</h1>
          <div className="flex gap-4 items-center">
            <Select
              value={language}
              onValueChange={(value: "en" | "zh") => setLanguage(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="zh">中文</SelectItem>
              </SelectContent>
            </Select>
            <ModeToggle />
            <Link
              href="https://github.com/yuemiyuki/qubic-calculator-next"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="icon">
                <Github className="h-[1.2rem] w-[1.2rem]" />
                <span className="sr-only">GitHub</span>
              </Button>
            </Link>
          </div>
        </motion.div>

        <Tabs defaultValue="calculator" className="mb-8">
          <TabsList>
            <TabsTrigger value="calculator">{t.calculator}</TabsTrigger>
            <TabsTrigger value="graph">{t.graph}</TabsTrigger>
            <TabsTrigger value="donate">{t.donate}</TabsTrigger>
          </TabsList>
          <TabsContent value="calculator">
            <div className="grid gap-8 md:grid-cols-2">
              <motion.div
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
                  <CardHeader>
                    <CardTitle>{t.hashrate}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Input
                        type="number"
                        value={hashrate}
                        onChange={(e) => setHashrate(e.target.value)}
                        placeholder="Enter your hashrate"
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        value={solsCount}
                        onChange={(e) => setSolsCount(e.target.value)}
                        placeholder={t.solsCount}
                      />
                    </div>
                    <Button onClick={calculateIncome} className="w-full">
                      {t.calculate}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              {epochInfo && (
                <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
                    <CardHeader>
                      <CardTitle>{t.epochInfo}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">
                              {t.currentEpoch}
                            </TableCell>
                            <TableCell>{epochInfo.epochNumber}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">
                              {t.epochStart}
                            </TableCell>
                            <TableCell>
                              {formatDate(epochInfo.curEpochBegin)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">
                              {t.epochEnd}
                            </TableCell>
                            <TableCell>
                              {formatDate(epochInfo.curEpochEnd)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">
                              {t.epochProgress}
                            </TableCell>
                            <TableCell>
                              {(epochInfo.curEpochProgress * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>

            <div className="grid gap-8 md:grid-cols-2 mt-8">
              <motion.div
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
                  <CardHeader>
                    <CardTitle>{t.networkInfo}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">
                            {t.estimatedHashrate}
                          </TableCell>
                          <TableCell>
                            {networkStats?.estimatedIts.toLocaleString()} it/s
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">
                            {t.averageScore}
                          </TableCell>
                          <TableCell>
                            {networkStats?.averageScore.toFixed(2)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">
                            {t.solutionsPerHour}
                          </TableCell>
                          <TableCell>
                            {networkStats?.solutionsPerHourCalculated.toFixed(
                              2,
                            )}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">
                            Difficulty
                          </TableCell>
                          <TableCell>{networkStats?.difficulty}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">
                            Created At
                          </TableCell>
                          <TableCell>
                            {new Date(
                              networkStats?.createdAt ?? "",
                            ).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.5, delay: 0.8 }}
              >
                <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
                  <CardHeader className="flex justify-between items-center">
                    <CardTitle>{t.incomeEstimate}</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setMethod("method1")}
                        variant={method === "method1" ? "default" : "ghost"}
                      >
                        Average score
                      </Button>
                      <Button
                        onClick={() => setMethod("method2")}
                        variant={method === "method2" ? "default" : "ghost"}
                      >
                        Total score / 676
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {income ? (
                      <Table>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">
                              {t.qubicPrice}
                            </TableCell>
                            <TableCell>
                              ${income.qubicPrice.toFixed(8)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">
                              {t.dailyIncome}
                            </TableCell>
                            <TableCell>
                              ${income.dailyIncome.toFixed(2)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">
                              {method === "method1"
                                ? t.dailyIncomeBySols
                                : "Estimated Solutions Income"}
                            </TableCell>
                            <TableCell>
                              ${method === "method1"
                                ? income.dailyIncomeBySols.toFixed(2)
                                : income.dailyIncomeBySolsCal.toFixed(2)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">
                              {method === "method1"
                                ? t.solIncome
                                : "Estimated Income per Solution"}
                            </TableCell>
                            <TableCell>
                              ${method === "method1"
                                ? income.curSolPrice.toFixed(2)
                                : income.curSolPriceCal.toFixed(2)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">
                              {t.dailySolutions}
                            </TableCell>
                            <TableCell>
                              {income.dailySolutions.toFixed(3)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">
                              {t.luckiness}
                            </TableCell>
                            <TableCell>{income.luckiness.toFixed(2)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-center">{t.pressCalculate}</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>
          <TabsContent value="graph">
            {networkStats && <NetworkGraphs networkStats={networkStats} />}
          </TabsContent>
          <TabsContent value="donate">
            <div className="grid gap-8 md:grid-cols-1 mt-8">
              <motion.div
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.5, delay: 1.0 }}
              >
                <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
                  <CardHeader>
                    <CardTitle>{t.donateInfo}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">
                            {t.qubicAddress}
                          </TableCell>
                          <TableCell>
                            UOSGCOLKQANTLABVKQWUVZCPIXYBEKQWWGARBDAVSGAGGTWCZZKBDDAEBDXK
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">
                            {t.erc20Address}
                          </TableCell>
                          <TableCell>
                            0x9d2b0b8e9C8A3F41415545CF7dB4627b50c52285
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>
        </Tabs>

        {error && <p className="mt-4 text-center text-red-500">{error}</p>}
      </div>

      <footer className="py-4 text-center border-t relative z-10">
        <p>
          Powered by{" "}
          <Link
            href="https://nextjs.org"
            className="text-primary hover:underline"
          >
            Next.js
          </Link>
        </p>
        <p>
          Made with ❤️ by{" "}
          <Link
            href="https://mdesk.tech"
            className="text-primary hover:underline"
          >
            mdesk.tech
          </Link>
        </p>
      </footer>
    </div>
  );
}