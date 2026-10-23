module tb;
  reg clk = 0;
  always #5 clk = ~clk;
reg [7:0] ui_in, uio_in;
  wire [7:0] uo_out, uio_out, uio_oe;
  reg ena, rst_n;
  tt_um_counter dut(
    .ui_in(ui_in), .uo_out(uo_out),
    .uio_in(uio_in), .uio_out(uio_out), .uio_oe(uio_oe),
    .ena(ena), .clk(clk), .rst_n(rst_n)
  );
  initial begin
    ui_in = 0; uio_in = 0; ena = 1; rst_n = 0;
    repeat (2) @(posedge clk);
    rst_n = 1;
    repeat (4) @(posedge clk);
    #1;
    if (uo_out === 8'd4) $display("PASS uo_out=%0d", uo_out);
    else $display("FAIL uo_out=%0d", uo_out);
    $finish;
  end
endmodule
