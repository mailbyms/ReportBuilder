CREATE TABLE IF NOT EXISTS reports (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '报告的唯一标识符，自增长主键',
  `report_name` varchar(255) NOT NULL COMMENT '报告的名称，不能为空',
  `report_content` text COMMENT '报告的实际内容，以文本格式存储，例如富文本编辑器的HTML输出',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '报告创建的时间，默认为当前时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '报告最后更新的时间，每次更新时自动更新为当前时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4;