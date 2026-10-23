module tb;
  reg clk = 0;
  always #5 clk = ~clk;
reg rst, se, si, d;
  wire q;
  scan_ff dut(.clk(clk), .rst(rst), .se(se), .si(si), .d(d), .q(q));
  initial begin
    rst = 1; se = 0; si = 0; d = 0;
    repeat (2) @(posedge clk);
    @(negedge clk); rst = 0; se = 1; si = 1; d = 0;
    @(posedge clk); #1;
    if (q !== 1'b1) begin $display("FAIL scan q=%b", q); $finish; end
    @(negedge clk); se = 0; d = 0; si = 0;
    @(posedge clk); #1;
    if (q === 1'b0) $display("PASS scan then functional");
    else $display("FAIL functional q=%b", q);
    $finish;
  end
endmodule
